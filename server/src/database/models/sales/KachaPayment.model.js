module.exports = (sequelize, DataTypes) => {
  const KachaPayment = sequelize.define(
    "KachaPayment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      companyId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      saleId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      initiatedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      /** Merchant unique id sent to Kacha as trace_number */
      traceNumber: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },

      /**
       * Kacha payment reference returned by in_app request —
       * pass to window.KachaSuperApp.requestPayment({ reference }).
       */
      kachaReference: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },

      /**
       * Callback ext_reference (Kacha internal id). Distinct from merchant
       * reference / bridge reference per Kacha docs.
       */
      extReference: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },

      phone: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },

      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0 },
      },

      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM(
          "PENDING",
          "PROCESSED",
          "CANCELED",
          "EXPIRED",
          "FAILED",
        ),
        allowNull: false,
        defaultValue: "PENDING",
      },

      /** Set once when a terminal callback is applied (idempotency). */
      appliedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      callbackPayload: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      requestPayload: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "kacha_payments",
      indexes: [
        { fields: ["saleId"] },
        { fields: ["companyId"] },
        { fields: ["status"] },
        { fields: ["kachaReference"] },
        { fields: ["extReference"] },
      ],
    },
  );

  KachaPayment.associate = (models) => {
    KachaPayment.belongsTo(models.Sale, {
      foreignKey: "saleId",
      as: "sale",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    KachaPayment.belongsTo(models.User, {
      foreignKey: "initiatedBy",
      as: "initiator",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    KachaPayment.belongsTo(models.Company, {
      foreignKey: "companyId",
      as: "company",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  };

  return KachaPayment;
};
