import { apiUrl } from "../api/api";

class UserService {

    // Get all users
    getAllUsers() {
        return apiUrl.get("users/getAll");
    }

    // Get user by ID
    getUserById(id) {
        return apiUrl.get(`users/getById/${id}`);
    }

    // Get users by department
    getUsersByDepartment(departmentId) {
        return apiUrl.get(`users/getByDepartment/${departmentId}`);
    }

}

export default new UserService();