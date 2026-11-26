-- =====================================================================
-- LegalCase Management System - Exact Database Schema
-- Extracted from Client's Production Access Database (dbBilling.mdb)
-- Target Database: legalcase_db (MySQL / MariaDB)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `legalcase_db` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `legalcase_db`;

-- ---------------------------------------------------------------------
-- 1. Table: ClientMaster (3,165 Records in Client DB)
-- Stores primary details of all registered clients / parties
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ClientMaster` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ClientName` VARCHAR(255) NOT NULL,
  `So` VARCHAR(255) DEFAULT NULL COMMENT 'Son of / Daughter of / Care of',
  `Address` TEXT DEFAULT NULL,
  `PhoneNo` VARCHAR(100) DEFAULT NULL,
  `RefName` VARCHAR(255) DEFAULT NULL COMMENT 'Reference Person / Advocate Name',
  `RefPhNo` VARCHAR(100) DEFAULT NULL COMMENT 'Reference Contact Number',
  `ConFees` DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Agreed Consultancy Fees',
  `ClientDate` VARCHAR(50) DEFAULT NULL COMMENT 'Registration Date (YYYY-MM-DD)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_client_name` (`ClientName`),
  INDEX `idx_client_phone` (`PhoneNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. Table: CaseMaster (3,195 Records in Client DB)
-- Stores complete court case master details linked to ClientMaster
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `CaseMaster` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ClientId` INT DEFAULT NULL COMMENT 'Foreign Key -> ClientMaster.ID',
  `CaseNo` VARCHAR(150) DEFAULT NULL COMMENT 'Court Case Registration Number (e.g. GR - 175/14)',
  `PsCaseNo` VARCHAR(150) DEFAULT NULL COMMENT 'Police Station Case Number (e.g. CONTAI - 42/14)',
  `CourtName` VARCHAR(255) DEFAULT NULL COMMENT 'Court Name (e.g. III - JM, ACJM)',
  `StartDate` VARCHAR(50) DEFAULT NULL COMMENT 'Case Filing / Start Date',
  `PPName` VARCHAR(255) DEFAULT NULL COMMENT 'Public Prosecutor Name',
  `PsCaseDate` VARCHAR(50) DEFAULT NULL COMMENT 'Police Station Case Date',
  `RackNo` VARCHAR(50) DEFAULT NULL COMMENT 'Chamber Physical File Rack Number',
  `RoomNo` VARCHAR(50) DEFAULT NULL COMMENT 'Chamber Room Number',
  `Us` VARCHAR(255) DEFAULT NULL COMMENT 'Under Section (e.g. 302/34 IPC, 138 NI Act)',
  `For` VARCHAR(255) DEFAULT NULL COMMENT 'Case Nature / Stage (e.g. Bail, Injunction, Trial)',
  `LcName` VARCHAR(255) DEFAULT NULL COMMENT 'Lower Court / Legal Counsel Name',
  `VersusName` VARCHAR(255) DEFAULT NULL COMMENT 'Opposite Party Name (e.g. State of WB / Other Person)',
  `AdAdvName` VARCHAR(255) DEFAULT NULL COMMENT 'Additional / Appearing Advocate Name',
  `CaseDetails` LONGTEXT DEFAULT NULL COMMENT 'Full Brief & Running Notes',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_case_client` (`ClientId`),
  INDEX `idx_case_number` (`CaseNo`),
  INDEX `idx_court_name` (`CourtName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. Table: CaseNext (17,752 Records in Client DB)
-- Stores upcoming hearing dates and reminder schedules for Court Cases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `CaseNext` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `CaseId` INT DEFAULT NULL COMMENT 'Foreign Key -> CaseMaster.ID',
  `NextDate` VARCHAR(50) DEFAULT NULL COMMENT 'Next Court Hearing Date (YYYY-MM-DD)',
  `For` VARCHAR(255) DEFAULT NULL COMMENT 'Hearing Stage / Purpose (e.g. Appearance, Evidence, Argument)',
  `CourtName` VARCHAR(255) DEFAULT NULL COMMENT 'Court Room / Judge Name',
  `PPName` VARCHAR(255) DEFAULT NULL COMMENT 'Public Prosecutor / In-charge Name',
  `OtherAc` TEXT DEFAULT NULL COMMENT 'Specific Court Direction / Next Step Notes',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_casenext_case` (`CaseId`),
  INDEX `idx_casenext_date` (`NextDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. Table: Billing (14,348 Records in Client DB)
-- Stores all bills / invoices generated for clients
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Billing` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ClientId` INT DEFAULT NULL COMMENT 'Foreign Key -> ClientMaster.ID',
  `BillingDate` VARCHAR(50) DEFAULT NULL COMMENT 'Bill Date (YYYY-MM-DD)',
  `Amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Billed Amount',
  `Details` VARCHAR(255) DEFAULT NULL COMMENT 'Bill Particulars / Service Description',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_billing_client` (`ClientId`),
  INDEX `idx_billing_date` (`BillingDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. Table: Payment (15,045 Records in Client DB)
-- Stores client fee payments, advances, and money receipts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Payment` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ClientId` INT DEFAULT NULL COMMENT 'Foreign Key -> ClientMaster.ID',
  `PaymentDate` VARCHAR(50) DEFAULT NULL COMMENT 'Payment Date (YYYY-MM-DD)',
  `Amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Paid Amount',
  `Details` VARCHAR(255) DEFAULT NULL COMMENT 'Payment Mode / Receipt / Remarks',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_payment_client` (`ClientId`),
  INDEX `idx_payment_date` (`PaymentDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. Table: ExpenseHeadMaster (124 Records in Client DB)
-- Stores chamber expense categories / heads of accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ExpenseHeadMaster` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ExpenseHead` VARCHAR(255) NOT NULL COMMENT 'Category Name (e.g. Salary, Electricity, Books, Clerk)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `uniq_expense_head` (`ExpenseHead`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. Table: Expense (15,674 Records in Client DB)
-- Stores daily chamber expenditures and out-of-pocket court costs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Expense` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ExpenseId` INT DEFAULT NULL COMMENT 'Foreign Key -> ExpenseHeadMaster.ID',
  `PaidTo` VARCHAR(255) DEFAULT NULL COMMENT 'Recipient / Vendor Name',
  `ExpenseDate` VARCHAR(50) DEFAULT NULL COMMENT 'Expense Date (YYYY-MM-DD)',
  `Amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Spent Amount',
  `Details` VARCHAR(255) DEFAULT NULL COMMENT 'Voucher Details / Description',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_expense_head` (`ExpenseId`),
  INDEX `idx_expense_date` (`ExpenseDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. Table: WaitingList (Chamber Reception Queue & TV Display)
-- Stores daily visitor token queue for consultations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `WaitingList` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `Name` VARCHAR(255) NOT NULL COMMENT 'Client / Visitor Name',
  `Status` INT DEFAULT 0 COMMENT '0=Waiting, 1=In Consultation, 2=Completed',
  `Address` VARCHAR(255) DEFAULT NULL,
  `PhoneNo` VARCHAR(50) DEFAULT NULL,
  `TimeSlot` VARCHAR(50) DEFAULT NULL,
  `ConsultancyType` VARCHAR(50) DEFAULT 'Conference' COMMENT 'Emergency OR Conference',
  `QueueDate` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_waiting_status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. Table: ClientInformation
-- Stores client calling history and consultation remarks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ClientInformation` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `ClientId` INT DEFAULT NULL COMMENT 'Foreign Key -> ClientMaster.ID',
  `CallDate` VARCHAR(50) DEFAULT NULL COMMENT 'Follow-up Date',
  `Details` VARCHAR(255) DEFAULT NULL COMMENT 'Calling Remarks / Status',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`),
  INDEX `idx_clientinfo_client` (`ClientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. Table: Announcements (For Digital Signage / TV Display Feature)
-- Stores notices, scroll tickers, and court advisories for TV Screen
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Announcements` (
  `ID` INT NOT NULL AUTO_INCREMENT,
  `Headline` VARCHAR(255) NOT NULL,
  `Message` TEXT NOT NULL,
  `Category` VARCHAR(100) DEFAULT 'Chamber Advisory',
  `Priority` VARCHAR(50) DEFAULT 'Normal' COMMENT 'Normal OR Urgent',
  `NoticeDate` VARCHAR(50) DEFAULT NULL,
  `IsActive` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
