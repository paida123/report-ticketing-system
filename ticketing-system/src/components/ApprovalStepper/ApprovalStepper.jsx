import React, { useEffect, useState } from 'react';
import TicketApprovalService from '../../services/ticketApproval.service';
import './ApprovalStepper.css';

const ApprovalStepper = ({ ticketId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    if (!ticketId) return;

    const loadProgress = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await TicketApprovalService.getApprovalProgress(ticketId);
        const data = response?.data?.data;
        if (data && data.required) {
          setProgressData(data);
        } else {
          setProgressData(null);
        }
      } catch (err) {
        console.error('Failed to load approval progress:', err);
        setError('Failed to load approval progress');
      } finally {
        setLoading(false);
      }
    };

    loadProgress();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="approval-stepper-loading">
        <div className="spinner-small" />
        <span>Loading approval progress...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="approval-stepper-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
          <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (!progressData || !progressData.steps || progressData.steps.length === 0) {
    return null;
  }

  return (
    <div className="approval-stepper-container">
      <div className="approval-stepper-header">
        <h4>Approval Progress</h4>
        <span className="approval-stepper-badge">
          {progressData.current_approvals} of {progressData.required_approvals} approved
        </span>
      </div>

      <div className="approval-stepper-steps">
        {progressData.steps.map((step, index) => {
          const isApproved = step.status === 'APPROVED';
          const isPending = step.status === 'PENDING';
          const isRejected = step.status === 'REJECTED';
          const isLast = index === progressData.steps.length - 1;

          return (
            <div key={index} className="approval-step-wrapper">
              <div className={`approval-step ${isApproved ? 'approved' : isPending ? 'pending' : 'rejected'}`}>
                <div className="approval-step-indicator">
                  <div className="approval-step-circle">
                    {isApproved && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {isRejected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M6 18L18 6" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {isPending && <span className="step-number">{step.step_number}</span>}
                  </div>
                  {!isLast && <div className="approval-step-line" />}
                </div>

                <div className="approval-step-content">
                  <div className="approval-step-role">
                    <span className="role-name">{step.role}</span>
                    {step.department && (
                      <span className="department-badge">{step.department}</span>
                    )}
                  </div>

                  {isApproved && step.approved_by && (
                    <div className="approval-step-info approved-info">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" />
                        <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>
                        Approved by <strong>{step.approved_by.name}</strong>
                      </span>
                      {step.approved_at && (
                        <span className="approval-time">
                          {new Date(step.approved_at).toLocaleDateString()} at{' '}
                          {new Date(step.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {isRejected && step.approved_by && (
                    <div className="approval-step-info rejected-info">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                        <path d="M8 8l8 8M8 16l8-8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span>
                        Rejected by <strong>{step.approved_by.name}</strong>
                      </span>
                      {step.comment && (
                        <div className="rejection-comment">
                          <strong>Reason:</strong> {step.comment}
                        </div>
                      )}
                    </div>
                  )}

                  {isPending && (
                    <div className="approval-step-info pending-info">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" />
                        <path d="M12 7v5l3 2" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span>Awaiting approval</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalStepper;
