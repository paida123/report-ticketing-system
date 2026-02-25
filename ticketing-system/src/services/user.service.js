import { apiUrl } from "../api/api";

class UserService {

   
    getAllUsers(params = {}) {
        return apiUrl.get("users/getAll", { params });
    }

    
    getUserById(id) {
        return apiUrl.get(`users/getById/${id}`);
    }

  
    getUsersByDepartment(departmentId, params = {}) {
        return apiUrl.get(`users/getByDepartment/${departmentId}`, { params });
    }

    createUser(data) {
        return apiUrl.post("users/create", data);
    }

    updateUser(id, data) {
        return apiUrl.patch(`users/update/${id}`, data);
    }

    updateUserStatus(id, status) {
        return apiUrl.patch(`users/status/${id}`, { status });
    }
}

export default new UserService();