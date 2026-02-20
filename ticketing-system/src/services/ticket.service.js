import { apiUrl } from "../api/api";

class TicketService {

    createTicket(ticketData) {
        return apiUrl.post("ticket", ticketData);
    }

    getAllTickets(params = {}) {
        return apiUrl.get("ticket/getall", { params });
    }

    
    getTicketById(id) {
        return apiUrl.get(`ticket/getById/${id}`);
    }

   
    closeTicket(id) {
        return apiUrl.patch(`ticket/close/${id}`);
    }

}

export default new TicketService();
