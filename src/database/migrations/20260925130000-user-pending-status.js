"use strict";

/** Add PENDING to users.status for OTP registration activation. */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING')
      NOT NULL DEFAULT 'ACTIVE'
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE users SET status = 'INACTIVE' WHERE status = 'PENDING'
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')
      NOT NULL DEFAULT 'ACTIVE'
    `);
  },
};
