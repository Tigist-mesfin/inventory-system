const { randomUUID } = require("crypto");
const models = require("../../database/models");
const AppError = require("../../shared/errors/AppError");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const smsService = require("../../shared/sms/sms.service");

const { Company } = models;

const QUEUE_DELAY_MS = Math.max(
  200,
  Number(process.env.SMS_QUEUE_DELAY_MS) || 500,
);

/** @type {Map<string, object>} */
const jobs = new Map();
/** @type {Array<{ jobId: string, index: number }>} */
const queue = [];
let processing = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolvePhone = (raw) => {
  const normalized = phoneNormalize(raw) || String(raw || "").trim().replace(/^\+/, "");
  return smsService.normalizeEthPhone(normalized);
};

const buildText = (title, body) => {
  const message = smsService.formatMessage(title, body);
  if (!message) {
    throw AppError.badRequest("Title or body is required", "SMS_MESSAGE_REQUIRED");
  }
  if (message.length > smsService.MAX_SMS_CHARS) {
    throw AppError.badRequest(
      `Combined title and body must be at most ${smsService.MAX_SMS_CHARS} characters`,
      "SMS_MESSAGE_TOO_LONG",
    );
  }
  return message;
};

const processQueue = async () => {
  if (processing) return;
  processing = true;
  try {
    while (queue.length) {
      const item = queue.shift();
      const job = jobs.get(item.jobId);
      if (!job) continue;
      const recipient = job.recipients[item.index];
      if (!recipient) continue;

      recipient.status = "sending";
      job.updatedAt = new Date().toISOString();
      try {
        await smsService.sendMessage(recipient.phone, job.message);
        recipient.status = "sent";
        job.sent += 1;
      } catch (err) {
        recipient.status = "failed";
        recipient.error = err.message || "Send failed";
        job.failed += 1;
      }
      job.processed += 1;
      if (job.processed >= job.total) {
        job.status = job.failed === job.total ? "failed" : job.failed ? "partial" : "completed";
      }
      job.updatedAt = new Date().toISOString();
      await sleep(QUEUE_DELAY_MS);
    }
  } finally {
    processing = false;
    if (queue.length) processQueue();
  }
};

const enqueueJob = ({ title, body, message, recipients, mode }) => {
  const jobId = randomUUID();
  const job = {
    id: jobId,
    mode,
    title,
    body,
    message,
    status: "queued",
    total: recipients.length,
    processed: 0,
    sent: 0,
    failed: 0,
    recipients,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(jobId, job);
  recipients.forEach((_, index) => queue.push({ jobId, index }));
  setImmediate(() => processQueue());
  return {
    jobId,
    mode,
    status: job.status,
    total: job.total,
    queued: job.total,
  };
};

exports.sendSingleCompanySms = async ({ companyId, title, body }) => {
  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name", "phone", "status"],
  });
  if (!company) throw AppError.notFound("Company not found");

  const phone = resolvePhone(company.phone);
  if (!phone) {
    throw AppError.badRequest(
      "Company phone is missing or invalid for SMS",
      "SMS_PHONE_INVALID",
    );
  }

  const message = buildText(title, body);
  const result = await smsService.sendMessage(phone, message);
  return {
    companyId: company.id,
    companyName: company.name,
    phone: result.phone,
    title: String(title || "").trim(),
    body: String(body || "").trim(),
    length: result.length,
  };
};

exports.enqueueBulkCompanySms = async ({ title, body, status }) => {
  const where = {};
  if (status) where.status = status;

  const companies = await Company.findAll({
    where,
    attributes: ["id", "name", "phone", "status"],
    order: [["createdAt", "DESC"]],
  });

  const recipients = [];
  const skipped = [];
  const seen = new Set();

  for (const company of companies) {
    const phone = resolvePhone(company.phone);
    if (!phone) {
      skipped.push({ companyId: company.id, name: company.name, reason: "invalid_phone" });
      continue;
    }
    if (seen.has(phone)) {
      skipped.push({ companyId: company.id, name: company.name, reason: "duplicate_phone" });
      continue;
    }
    seen.add(phone);
    recipients.push({
      companyId: company.id,
      companyName: company.name,
      phone,
      status: "queued",
      error: null,
    });
  }

  if (!recipients.length) {
    throw AppError.badRequest(
      "No companies with a valid phone number to message",
      "SMS_NO_RECIPIENTS",
    );
  }

  const message = buildText(title, body);
  const queued = enqueueJob({
    title: String(title || "").trim(),
    body: String(body || "").trim(),
    message,
    recipients,
    mode: "bulk",
  });

  return {
    ...queued,
    skipped: skipped.length,
    skippedSample: skipped.slice(0, 10),
  };
};

exports.getSmsJob = (jobId) => {
  const job = jobs.get(jobId);
  if (!job) throw AppError.notFound("SMS job not found");
  return {
    id: job.id,
    mode: job.mode,
    title: job.title,
    body: job.body,
    status: job.status,
    total: job.total,
    processed: job.processed,
    sent: job.sent,
    failed: job.failed,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    recipients: job.recipients.map((r) => ({
      companyId: r.companyId,
      companyName: r.companyName,
      phone: r.phone,
      status: r.status,
      error: r.error || null,
    })),
  };
};
