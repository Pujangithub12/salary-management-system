-- CreateTable
CREATE TABLE "TaxSlab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fiscalYear" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "upTo" DECIMAL,
    "rate" DECIMAL NOT NULL,
    "socialSecurity" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "EmployeeSalary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "ssfEnrolled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeeSalary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeSalaryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salaryId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "annualAmount" DECIMAL NOT NULL,
    CONSTRAINT "EmployeeSalaryItem_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "EmployeeSalary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeSalaryItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "SalaryComponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxSlab_fiscalYear_sortOrder_key" ON "TaxSlab"("fiscalYear", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalary_employeeId_fiscalYear_key" ON "EmployeeSalary"("employeeId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryItem_salaryId_componentId_key" ON "EmployeeSalaryItem"("salaryId", "componentId");
