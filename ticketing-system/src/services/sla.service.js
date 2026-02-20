import { apiUrl } from "../api/api";

class SlaService {

   
    getAllSla(params = {}) {
        return apiUrl.get("sla/getAll", { params });
    }

}

export default new SlaService();
