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
  const [tempFocused, setTempFocused] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

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
      {/* Background Decoration */}
      <div className="background-decoration">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Left Side */}
      <div className="left-side">
        <div className="left-content">
          <div className="animation-container" ref={leftLottieRef} />
          <div className="brand-text">
            <h2 className="brand-title">Secure Your Account</h2>
            <p className="brand-subtitle">Create a strong password to protect your account and get started with our platform.</p>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="right-side">
        <div className="right-content">
          <div className="logo-container">
            <img src={omniLogo} alt="Omni Logo" className="logo" />
          </div>

          <div className="login-card">
            <div className="card-header">
              <h1 className="welcome-title">Set Up Your Password</h1>
              <p className="welcome-subtitle">Enter your temporary password and create a new secure password.</p>
            </div>

            {serverMessage && (
              <div className="server-info" role="status">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 2L2 7L10 12L18 7L10 2Z"></path>
                  <path d="M2 12L10 17L18 12"></path>
                </svg>
                {serverMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="login-form">
              {/* Temporary Password */}
              <div className="form-group">
                <label htmlFor="temp">Temporary Password</label>
                <div className={`input-wrapper ${tempFocused ? 'focused' : ''} ${touched.tempPassword && errors.tempPassword ? 'error' : ''}`}>
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="14" height="10" rx="2"></rect>
                      <path d="M7 8V5a3 3 0 016 0v3"></path>
                    </svg>
                  </div>
                  <input
                    id="temp"
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    onFocus={() => setTempFocused(true)}
                    onBlur={() => { setTempFocused(false); setTouched(t => ({ ...t, tempPassword: true })); }}
                    aria-invalid={!!errors.tempPassword}
                    placeholder="Enter temporary password"
                  />
                </div>
                {touched.tempPassword && errors.tempPassword && (
                  <div className="error-message" role="alert">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="7"></circle>
                      <line x1="8" y1="4" x2="8" y2="8"></line>
                      <line x1="8" y1="11" x2="8.01" y2="11"></line>
                    </svg>
                    {errors.tempPassword}
                  </div>
                )}
              </div>

              {/* New Password */}
              <div className="form-group">
                <label htmlFor="newpw">New Password</label>
                <div className={`input-wrapper ${newFocused ? 'focused' : ''} ${touched.newPassword && errors.newPassword ? 'error' : ''}`}>
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="14" height="10" rx="2"></rect>
                      <path d="M7 8V5a3 3 0 016 0v3"></path>
                    </svg>
                  </div>
                  <input
                    id="newpw"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setNewFocused(true)}
                    onBlur={() => { setNewFocused(false); setTouched(t => ({ ...t, newPassword: true })); }}
                    aria-invalid={!!errors.newPassword}
                    placeholder="Enter new password"
                  />
                  <button type="button" className="show-password-btn" onClick={() => setShowNew(s => !s)} aria-label={showNew ? 'Hide password' : 'Show password'}>
                    {showNew ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.12 14.12C13.8454 14.3804 13.5141 14.5808 13.1462 14.7063C12.7782 14.8319 12.3809 14.8794 11.9875 14.8456C11.594 14.8117 11.2126 14.6971 10.8686 14.5093C10.5247 14.3214 10.2262 14.0643 9.99 13.7543C9.75385 13.4444 9.58581 13.0881 9.49679 12.7086C9.40777 12.329 9.39997 11.9346 9.47391 11.5518C9.54785 11.1689 9.70182 10.8061 9.92522 10.4869C10.1486 10.1677 10.4364 9.89897 10.77 9.70001M17.94 17.94L2.06 2.06M9.9 4.24A7.5 7.5 0 0 1 17.5 10C17.5 11.28 17.14 12.47 16.52 13.5M6.61 6.61A7.5 7.5 0 0 0 2.5 10C2.5 14.14 6.36 17.5 10 17.5C11.45 17.5 12.8 17.05 13.94 16.3"></path>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"></path>
                        <circle cx="10" cy="10" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {touched.newPassword && errors.newPassword && (
                  <div className="error-message" role="alert">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="7"></circle>
                      <line x1="8" y1="4" x2="8" y2="8"></line>
                      <line x1="8" y1="11" x2="8.01" y2="11"></line>
                    </svg>
                    {errors.newPassword}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="conf">Confirm Password</label>
                <div className={`input-wrapper ${confirmFocused ? 'focused' : ''} ${touched.confirmPassword && errors.confirmPassword ? 'error' : ''}`}>
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="14" height="10" rx="2"></rect>
                      <path d="M7 8V5a3 3 0 016 0v3"></path>
                    </svg>
                  </div>
                  <input
                    id="conf"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => { setConfirmFocused(false); setTouched(t => ({ ...t, confirmPassword: true })); }}
                    aria-invalid={!!errors.confirmPassword}
                    placeholder="Confirm new password"
                  />
                  <button type="button" className="show-password-btn" onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    {showConfirm ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.12 14.12C13.8454 14.3804 13.5141 14.5808 13.1462 14.7063C12.7782 14.8319 12.3809 14.8794 11.9875 14.8456C11.594 14.8117 11.2126 14.6971 10.8686 14.5093C10.5247 14.3214 10.2262 14.0643 9.99 13.7543C9.75385 13.4444 9.58581 13.0881 9.49679 12.7086C9.40777 12.329 9.39997 11.9346 9.47391 11.5518C9.54785 11.1689 9.70182 10.8061 9.92522 10.4869C10.1486 10.1677 10.4364 9.89897 10.77 9.70001M17.94 17.94L2.06 2.06M9.9 4.24A7.5 7.5 0 0 1 17.5 10C17.5 11.28 17.14 12.47 16.52 13.5M6.61 6.61A7.5 7.5 0 0 0 2.5 10C2.5 14.14 6.36 17.5 10 17.5C11.45 17.5 12.8 17.05 13.94 16.3"></path>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z"></path>
                        <circle cx="10" cy="10" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <div className="error-message" role="alert">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="7"></circle>
                      <line x1="8" y1="4" x2="8" y2="8"></line>
                      <line x1="8" y1="11" x2="8.01" y2="11"></line>
                    </svg>
                    {errors.confirmPassword}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button type="submit" className="login-button" disabled={submitting || Object.keys(errors).length > 0}>
                {submitting ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v4M10 14v4M18 10h-4M6 10H2M15.657 4.343l-2.828 2.828M7.172 12.828l-2.829 2.829M15.657 15.657l-2.828-2.828M7.172 7.172L4.343 4.343"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Set Password'
                )}
              </button>
            </form>

            <div className="footer-text">
              Already have an account? <a href="/login" className="footer-link">Sign in</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

