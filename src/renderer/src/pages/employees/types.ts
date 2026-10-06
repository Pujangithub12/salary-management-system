export interface Employee {
  id: string
  companyId: string
  company: { id: string; name: string }
  employeeCode: string
  fullName: string
  panNumber: string | null
  ssfNumber: string | null
  citizenshipNumber: string | null
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  dateOfBirth: string | null
  mobile: string | null
  email: string | null
  address: string | null
  emergencyContact: string | null
  photoPath: string | null
  departmentId: string | null
  designationId: string | null
  employeeType: 'PERMANENT' | 'TEMPORARY' | 'CONTRACT' | 'PART_TIME'
  status: 'ACTIVE' | 'INACTIVE' | 'RESIGNED' | 'TERMINATED'
  dateJoined: string
  dateLeft: string | null
  managerId: string | null
  grade: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
  bankBranch: string | null
  department: { id: string; name: string } | null
  designation: { id: string; title: string } | null
  manager: { id: string; fullName: string; employeeCode: string } | null
}
