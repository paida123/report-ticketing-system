import { apiUrl } from "../api/api";

class SlaService {

   
    getAllSla(params = {}) {
        return apiUrl.get("sla/getAll", { params });
    }

    getMySla(params = {}) {
        return apiUrl.get("sla/my-sla", { params });
    }

}

export default new SlaService();
