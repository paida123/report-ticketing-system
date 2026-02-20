import { apiUrl } from "../api/api";

class SlaService {

   
    getAllSla() {
        return apiUrl.get("sla/getAll");
    }

}

export default new SlaService();
