import { apiUrl } from "../api/api";

class RoleService {

    // Create a new role
    createRole(role) {
        return apiUrl.post("roles", role);
    }

    // Get all roles
    getAllRoles() {
        return apiUrl.get("roles/getAll");
    }

    // Delete a role by ID
    deleteRole(id) {
        return apiUrl.delete(`roles/delete/${id}`);
    }

    // Update a role by ID
    updateRole(id, data) {
        return apiUrl.patch(`roles/edit/${id}`, data);
    }

}

export default new RoleService();
