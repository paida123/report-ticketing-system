import React, { useState, useEffect, useRef } from 'react';
import '../signIn/SignIn.css';
import lottie from 'lottie-web';
import animationData from '../../../images/login with account (1).json';
import animatedData2 from '../../../images/Login (2).json';
import omniLogo from '../../../images/OmniLogo.png';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const leftLottieRef = useRef(null);
  const navigate = useNavigate();

  // Disable scrolling while on auth page
  useEffect(() => {
    try {
      document.documentElement.classList.add('auth-page');
      document.body.classList.add('auth-page');
    } catch (e) {}

    return () => {
      try {
        document.documentElement.classList.remove('auth-page');
        document.body.classList.remove('auth-page');
      } catch (e) {}
    };
  }, []);

  const validate = () => {
    const e = {};
    if (!tempPassword) e.tempPassword = 'Temporary password is required';
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 9) e.newPassword = 'Password must be at least 9 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  useEffect(() => { setErrors(validate()); /* eslint-disable-next-line */ }, [tempPassword, newPassword, confirmPassword]);

  useEffect(() => {
    if (!leftLottieRef.current) return;
    const leftAnim = lottie.loadAnimation({ container: leftLottieRef.current, renderer: 'svg', loop: true, autoplay: true, animationData: animatedData2 });
    return () => leftAnim.destroy();
  }, []);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ tempPassword: true, newPassword: true, confirmPassword: true });
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setServerMessage('');
    try {
      // simulate API call to verify temp password and set new password
      await new Promise(r => setTimeout(r, 700));
      // For demo: accept any tempPassword === 'temp1234' or accept always
      // In real app, call API here
      setServerMessage('Password set successfully. You may now login.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setServerMessage('Failed to set password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="left-side">
        <div className="animation-container" ref={leftLottieRef} />
      </div>

      <div className="right-side">
        <div className="logo-container">
          <img src={omniLogo} alt="Omni Logo" className="logo" />
        </div>

        <div className="login-card-container">
          <div className="login-card">
            <div className="card-header">
              <h1 className="welcome-title">Set up your password</h1>
             
            </div>

            {serverMessage && <div className="server-info" role="status">{serverMessage}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="temp">Temporary password</label>
                <div className="input-wrapper">
                  <input id="temp" type="password" value={tempPassword} onChange={(e)=>setTempPassword(e.target.value)} onBlur={()=>setTouched(t=>({ ...t, tempPassword:true }))} aria-invalid={!!errors.tempPassword} placeholder="Enter temporary password" />
                  {touched.tempPassword && errors.tempPassword && <div className="error-message" role="alert">{errors.tempPassword}</div>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newpw">New password</label>
                <div className="input-wrapper">
                  <div className="password-input-wrapper">
                    <input id="newpw" type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} onBlur={()=>setTouched(t=>({ ...t, newPassword:true }))} aria-invalid={!!errors.newPassword} placeholder="Enter new password" />
                    <button type="button" className="show-password-btn" onClick={()=>setShowNew(s=>!s)}>{showNew ? 'Hide' : 'Show'}</button>
                  </div>
                  {touched.newPassword && errors.newPassword && <div className="error-message" role="alert">{errors.newPassword}</div>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="conf">Confirm new password</label>
                <div className="input-wrapper">
                  <div className="password-input-wrapper">
                    <input id="conf" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} onBlur={()=>setTouched(t=>({ ...t, confirmPassword:true }))} aria-invalid={!!errors.confirmPassword} placeholder="Confirm new password" />
                    <button type="button" className="show-password-btn" onClick={()=>setShowConfirm(s=>!s)}>{showConfirm ? 'Hide' : 'Show'}</button>
                  </div>
                  {touched.confirmPassword && errors.confirmPassword && <div className="error-message" role="alert">{errors.confirmPassword}</div>}
                </div>
              </div>

              <button type="submit" className="login-button" disabled={submitting || Object.keys(errors).length > 0}>{submitting ? 'Saving...' : 'Set password'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

