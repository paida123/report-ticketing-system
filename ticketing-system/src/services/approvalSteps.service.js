import { apiUrl } from "../api/api";

class ApprovalStepsService {

    createApprovalStep(data) {
        return apiUrl.post("approval-steps", data);
    }

    
    getApprovalStepsByTicketType(ticketTypeId) {
        return apiUrl.get(`approval-steps/get/${ticketTypeId}`);
    }

  
    getAllApprovalSteps() {
        return apiUrl.get("approval-steps/getAll");
    }

 
    updateApprovalStep(id, data) {
        return apiUrl.put(`approval-steps/update/${id}`, data);
    }


    deleteApprovalStep(id) {
        return apiUrl.delete(`approval-steps/delete/${id}`);
    }

}

export default new ApprovalStepsService();
