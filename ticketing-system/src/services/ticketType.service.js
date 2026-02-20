import { apiUrl } from "../api/api";

class TicketTypeService {

    createTicketType(data) {
        return apiUrl.post("ticket-type", data);
    }

  
    getAllTicketTypes(params = {}) {
        return apiUrl.get("ticket-type/getAll", { params });
    }

   
    deleteTicketType(id) {
        return apiUrl.delete(`ticket-type/delete/${id}`);
    }

    
    updateTicketType(id, data) {
        return apiUrl.patch(`ticket-type/edit/${id}`, data);
    }

}

export default new TicketTypeService();
