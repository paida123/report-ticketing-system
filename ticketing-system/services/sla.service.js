import { apiUrl } from "../api/api";

class SlaService {

    // Get all SLA records
    getAllSla() {
        return apiUrl.get("sla/getAll");
    }

}

export default new SlaService();
