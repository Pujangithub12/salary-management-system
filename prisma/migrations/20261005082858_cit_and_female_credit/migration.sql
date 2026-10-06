-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmployeeSalary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "ssfEnrolled" BOOLEAN NOT NULL DEFAULT true,
    "citAnnual" DECIMAL NOT NULL DEFAULT 0,
    "femaleTaxCredit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EmployeeSalary" ("createdAt", "employeeId", "fiscalYear", "id", "ssfEnrolled", "updatedAt") SELECT "createdAt", "employeeId", "fiscalYear", "id", "ssfEnrolled", "updatedAt" FROM "EmployeeSalary";
DROP TABLE "EmployeeSalary";
ALTER TABLE "new_EmployeeSalary" RENAME TO "EmployeeSalary";
CREATE UNIQUE INDEX "EmployeeSalary_employeeId_fiscalYear_key" ON "EmployeeSalary"("employeeId", "fiscalYear");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
