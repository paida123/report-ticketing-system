 import { apiUrl } from "../api/api";

class DepartmentService {

    // Create a new department
    createDepartment(department) {
        return apiUrl.post("department", { department });
    }

    // Get all departments
    getAllDepartments() {
        return apiUrl.get("department/getAll");
    }

    // Delete a department by ID
    deleteDepartment(id) {
        return apiUrl.delete(`department/delete/${id}`);
    }

    // Update a department by ID
    updateDepartment(id, department) {
        return apiUrl.patch(`department/edit/${id}`, { department });
    }

}

export default new DepartmentService();