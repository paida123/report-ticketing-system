import { apiUrl } from "../api/api";

class RoleService {

  
    createRole(role) {
        return apiUrl.post("roles", role);
    }

    
    getAllRoles() {
        return apiUrl.get("roles/getAll");
    }

    
    deleteRole(id) {
        return apiUrl.delete(`roles/delete/${id}`);
    }

    
    updateRole(id, data) {
        return apiUrl.patch(`roles/edit/${id}`, data);
    }

}

export default new RoleService();
