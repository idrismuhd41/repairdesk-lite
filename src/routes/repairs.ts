import type { IncomingMessage, ServerResponse } from "node:http";
import db from "../db";
import { sendJson, readJsonBody } from "../utils/http";
import type { JsonPayload } from "../utils/http";

type Repair = {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  device: string;
  issue: string;
  notes: string | null;
  status: string;
  costLabour: number | null;
  costParts: number | null;
  createdAt: string;
  updatedAt: string;
};

const ALLOWED_STATUSES = [
  "received",
  "in_progress",
  "completed",
  "cancelled"
] as const;

const SELECT_COLUMNS = `
  id,
  customer_name    AS customerName,
  customer_phone   AS customerPhone,
  customer_address AS customerAddress,
  device,
  issue,
  notes,
  status,
  cost_labour      AS costLabour,
  cost_parts       AS costParts,
  created_at       AS createdAt,
  updated_at       AS updatedAt
`;

function findRepairById(id: number): Repair | undefined {
  return db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM repairs
    WHERE id = ?
  `).get(id) as Repair | undefined;
}

// ---------- helpers ----------

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return num;
}

// ---------- handlers ----------

function listRepairs(_req: IncomingMessage, res: ServerResponse): void {
  const repairs = db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM repairs
    ORDER BY id ASC
  `).all() as Repair[];

  sendJson(res, 200, {
    success: true,
    count: repairs.length,
    data: repairs
  });
}

function createRepair(req: IncomingMessage, res: ServerResponse): void {
  readJsonBody(req, res, (input: JsonPayload) => {
    const {
      device,
      issue,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      costLabour,
      costParts
    } = input as {
      device?: unknown;
      issue?: unknown;
      customerName?: unknown;
      customerPhone?: unknown;
      customerAddress?: unknown;
      notes?: unknown;
      costLabour?: unknown;
      costParts?: unknown;
    };

    // Required fields
    if (
      typeof device !== "string" || !device.trim() ||
      typeof issue !== "string" || !issue.trim()
    ) {
      return sendJson(res, 400, {
        success: false,
        message: "Device and issue are required"
      });
    }

    // Optional fields — validate if provided
    const cName = optionalString(customerName);
    const cPhone = optionalString(customerPhone);
    const cAddress = optionalString(customerAddress);
    const cNotes = optionalString(notes);
    const cLabour = optionalNumber(costLabour);
    const cParts = optionalNumber(costParts);

    if (cName === undefined && customerName !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "customerName must be a string or null"
      });
    }
    if (cPhone === undefined && customerPhone !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "customerPhone must be a string or null"
      });
    }
    if (cAddress === undefined && customerAddress !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "customerAddress must be a string or null"
      });
    }
    if (cNotes === undefined && notes !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "notes must be a string or null"
      });
    }
    if (cLabour === undefined && costLabour !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "costLabour must be a non-negative number or null"
      });
    }
    if (cParts === undefined && costParts !== undefined) {
      return sendJson(res, 400, {
        success: false,
        message: "costParts must be a non-negative number or null"
      });
    }

    const result = db.prepare(`
      INSERT INTO repairs (
        customer_name,
        customer_phone,
        customer_address,
        device,
        issue,
        notes,
        cost_labour,
        cost_parts
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cName ?? null,
      cPhone ?? null,
      cAddress ?? null,
      device.trim(),
      issue.trim(),
      cNotes ?? null,
      cLabour ?? null,
      cParts ?? null
    );

    const newRepair = findRepairById(Number(result.lastInsertRowid));

    sendJson(res, 201, {
      success: true,
      message: "Repair ticket created successfully",
      data: newRepair
    });
  });
}

function getRepair(_req: IncomingMessage, res: ServerResponse, id: number): void {
  const repair = findRepairById(id);

  if (!repair) {
    return sendJson(res, 404, {
      success: false,
      message: `Repair ticket ${id} not found`
    });
  }

  sendJson(res, 200, {
    success: true,
    data: repair
  });
}

function updateRepair(req: IncomingMessage, res: ServerResponse, id: number): void {
  readJsonBody(req, res, (input: JsonPayload) => {
    const existing = findRepairById(id);
    if (!existing) {
      return sendJson(res, 404, {
        success: false,
        message: `Repair ticket ${id} not found`
      });
    }

    const {
      status,
      device,
      issue,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      costLabour,
      costParts
    } = input as Record<string, unknown>;

    // Status has a whitelist
    if (status !== undefined) {
      if (
        typeof status !== "string" ||
        !(ALLOWED_STATUSES as readonly string[]).includes(status)
      ) {
        return sendJson(res, 400, {
          success: false,
          message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`
        });
      }
    }

    // Device and issue must remain non-empty if being changed
    if (device !== undefined) {
      if (typeof device !== "string" || !device.trim()) {
        return sendJson(res, 400, {
          success: false,
          message: "device must be a non-empty string"
        });
      }
    }
    if (issue !== undefined) {
      if (typeof issue !== "string" || !issue.trim()) {
        return sendJson(res, 400, {
          success: false,
          message: "issue must be a non-empty string"
        });
      }
    }

    const newStatus = (status as string | undefined) ?? existing.status;
    const newDevice = device !== undefined ? (device as string).trim() : existing.device;
    const newIssue = issue !== undefined ? (issue as string).trim() : existing.issue;
    const newCustomerName =
      customerName !== undefined ? optionalString(customerName) ?? null : existing.customerName;
    const newCustomerPhone =
      customerPhone !== undefined ? optionalString(customerPhone) ?? null : existing.customerPhone;
    const newCustomerAddress =
      customerAddress !== undefined ? optionalString(customerAddress) ?? null : existing.customerAddress;
    const newNotes =
      notes !== undefined ? optionalString(notes) ?? null : existing.notes;
    const newLabour =
      costLabour !== undefined ? optionalNumber(costLabour) ?? null : existing.costLabour;
    const newParts =
      costParts !== undefined ? optionalNumber(costParts) ?? null : existing.costParts;

    db.prepare(`
      UPDATE repairs
      SET
        customer_name    = ?,
        customer_phone   = ?,
        customer_address = ?,
        device           = ?,
        issue            = ?,
        notes            = ?,
        status           = ?,
        cost_labour      = ?,
        cost_parts       = ?,
        updated_at       = datetime('now')
      WHERE id = ?
    `).run(
      newCustomerName,
      newCustomerPhone,
      newCustomerAddress,
      newDevice,
      newIssue,
      newNotes,
      newStatus,
      newLabour,
      newParts,
      id
    );

    const updated = findRepairById(id);

    sendJson(res, 200, {
      success: true,
      message: `Repair ticket ${id} updated`,
      data: updated
    });
  });
}

function deleteRepair(_req: IncomingMessage, res: ServerResponse, id: number): void {
  const result = db.prepare(`
    DELETE FROM repairs WHERE id = ?
  `).run(id);

  if (result.changes === 0) {
    return sendJson(res, 404, {
      success: false,
      message: `Repair ticket ${id} not found`
    });
  }

  sendJson(res, 200, {
    success: true,
    message: `Repair ticket ${id} deleted`
  });
}

export {
  listRepairs,
  createRepair,
  getRepair,
  updateRepair,
  deleteRepair
};