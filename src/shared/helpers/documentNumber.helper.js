const models = require("../../database/models");
const AppError = require("../errors/AppError");

exports.nextDocumentNumber = async (documentType, transaction) => {
  const seq = await models.DocumentSequence.findOne({
    where: { documentType },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });

  if (!seq) {
    throw AppError.badRequest(`Unknown document type: ${documentType}`);
  }

  seq.lastValue += 1;
  await seq.save({ transaction });
  return `${seq.prefix}-${String(seq.lastValue).padStart(seq.padLength, "0")}`;
};
