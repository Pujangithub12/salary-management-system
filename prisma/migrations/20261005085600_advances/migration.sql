-- CreateTable
CREATE TABLE "EmployeeAdvance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salaryId" TEXT NOT NULL,
    "monthIndex" INTEGER NOT NULL,
    "openingAdvance" DECIMAL,
    "deductionMade" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "EmployeeAdvance_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "EmployeeSalary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvance_salaryId_monthIndex_key" ON "EmployeeAdvance"("salaryId", "monthIndex");
