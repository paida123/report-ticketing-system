import { apiUrl } from "../api/api";

class SlaService {

   
    getAllSla(params = {}) {
        return apiUrl.get("sla/getAll", { params });
    }

    getMySla(userId, params = {}) {
        return apiUrl.get(`sla/get-by-user-id/${userId}`, { params });
    }

}

export default new SlaService();
