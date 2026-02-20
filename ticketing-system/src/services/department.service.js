 import { apiUrl } from "../api/api";

class DepartmentService {


    createDepartment(department) {
        return apiUrl.post("department/", { department });
    }


    getAllDepartments() {
        return apiUrl.get("department/getAll");
    }

    
    deleteDepartment(id) {
        return apiUrl.delete(`department/delete/${id}`);
    }

    
    updateDepartment(id, department) {
        return apiUrl.patch(`department/edit/${id}`, { department });
    }

}

export default new DepartmentService();