import type { IncomingMessage, ServerResponse } from "node:http";
import db from "../db";
import { sendJson, readJsonBody } from "../utils/http";
import type { JsonPayload } from "../utils/http";

type Repair = {
  id: number;
  customerName: string | null;
  device: string;
  issue: string;
  status: string;
  createdAt: string;
};

const ALLOWED_STATUSES = ["received", "in_progress", "completed", "cancelled"] as const;

const SELECT_COLUMNS = `
  id,
  customer_name AS customerName,
  device,
  issue,
  status,
  created_at AS createdAt
`;

function findRepairById(id: number): Repair | undefined {
  return db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM repairs
    WHERE id = ?
  `).get(id) as Repair | undefined;
}

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
    const { device, issue, customerName } = input as {
      device?: unknown;
      issue?: unknown;
      customerName?: unknown;
    };

    if (
      typeof device !== "string" || !device.trim() ||
      typeof issue !== "string" || !issue.trim()
    ) {
      return sendJson(res, 400, {
        success: false,
        message: "Device and issue are required"
      });
    }

    if (
      customerName !== undefined &&
      (typeof customerName !== "string" || !customerName.trim())
    ) {
      return sendJson(res, 400, {
        success: false,
        message: "Customer name must be a non-empty string"
      });
    }

    const result = db.prepare(`
      INSERT INTO repairs (customer_name, device, issue)
      VALUES (?, ?, ?)
    `).run(
      customerName === undefined ? null : customerName.trim(),
      device.trim(),
      issue.trim()
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
    const { status } = input as { status?: unknown };

    if (
      typeof status !== "string" ||
      !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])
    ) {
      return sendJson(res, 400, {
        success: false,
        message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`
      });
    }

    const result = db.prepare(`
      UPDATE repairs
      SET status = ?
      WHERE id = ?
    `).run(status, id);

    if (result.changes === 0) {
      return sendJson(res, 404, {
        success: false,
        message: `Repair ticket ${id} not found`
      });
    }

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