import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import "./SignIn.css";
import lottie from 'lottie-web';
import animationData from '../../../images/login with account (1).json';
import omniLogo from '../../../images/OmniLogo.png';
import animatedData2 from '../../../images/Login (2).json';
import { useAuth, getDashboardByRole } from '../../../context/AuthContext';

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const lottieContainer = useRef(null);
  const leftLottieRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = location.state?.from?.pathname || getDashboardByRole(user.role);
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email";

    if (!password) e.password = "Password is required";
    else if (password.length < 9)
      e.password = "Password must be at least 9 characters";

    return e;
  };

  useEffect(() => {
    setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password]);

  useEffect(() => {
    if (!lottieContainer.current) return;
    const anim = lottie.loadAnimation({
      container: lottieContainer.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
    return () => anim.destroy();
  }, []);

  useEffect(() => {
    if (!leftLottieRef.current) return;
    const leftAnim = lottie.loadAnimation({
      container: leftLottieRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animatedData2,
    });
    return () => leftAnim.destroy();
  }, []);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setTouched({ email: true, password: true });

    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    setServerError("");

    try {
      const result = await login({ email, password });

      if (result.success) {
        // Check if MFA is required
        if (result.mfaRequired && result.mfaEnabled && result.mfaVerified) {
          // MFA challenge needed - redirect to MFA page
          navigate('/mfa-challenge');
          return;
        }

        if (result.mfaRequired && result.mfaEnabled && !result.mfaVerified) {
          // MFA setup needed
          navigate('/mfa-setup');
          return;
        }

        if (result.passPending) {
          // Password change required
          navigate('/change-password');
          return;
        }

        // Navigate to appropriate dashboard based on role
        const dashboardPath = getDashboardByRole(result.user.role);
        navigate(dashboardPath, { replace: true });
      } else {
        setServerError(result.message);
      }
    } catch (error) {
      setServerError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="background-decoration">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="left-side">
        <div className="left-content">
          <div className="animation-container" ref={leftLottieRef} />
          <div className="brand-text">
            <h2 className="brand-title">Streamline Your Workflow</h2>
            <p className="brand-subtitle">Manage tickets, track performance, and collaborate seamlessly with your team.</p>
          </div>
        </div>
      </div>

      <div className="right-side">
        <div className="right-content">
          <div className="logo-container">
            <img src={omniLogo} alt="Omni Logo" className="logo" />
          </div>

          <div className="login-card">
            <div className="card-header">
              <h1 className="welcome-title">Welcome Back</h1>
              <p className="welcome-subtitle">Sign in to continue to your dashboard</p>
            </div>

            {serverError && (
              <div className="server-error" role="alert">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10 6V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="10" cy="13" r="0.5" fill="currentColor" stroke="currentColor"/>
                </svg>
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className={`input-wrapper ${emailFocused ? 'focused' : ''} ${errors.email && touched.email ? 'error' : ''}`}>
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 5C3 3.89543 3.89543 3 5 3H15C16.1046 3 17 3.89543 17 5V15C17 16.1046 16.1046 17 15 17H5C3.89543 17 3 16.1046 3 15V5Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 5L10 10L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => { setEmailFocused(false); setTouched((t) => ({ ...t, email: true })); }}
                    aria-invalid={!!errors.email}
                  />
                </div>
                {touched.email && errors.email && (
                  <div className="error-message" role="alert">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="7" cy="9.5" r="0.5" fill="currentColor"/>
                    </svg>
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className={`input-wrapper ${passwordFocused ? 'focused' : ''} ${errors.password && touched.password ? 'error' : ''}`}>
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M7 8V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="10" cy="12" r="1" fill="currentColor"/>
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => { setPasswordFocused(false); setTouched((t) => ({ ...t, password: true })); }}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="show-password-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex="-1"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M10 6C13 6 16 8.5 17 10C16.5 10.8 15 12.5 13 13.5M7 7.5C5 8.5 3.5 9.8 3 10C3.5 10.8 5 12.5 7 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 10C3 10 5.5 5 10 5C14.5 5 17 10 17 10C17 10 14.5 15 10 15C5.5 15 3 10 3 10Z" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div className="error-message" role="alert">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M7 4V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="7" cy="9.5" r="0.5" fill="currentColor"/>
                    </svg>
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark">
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="checkbox-text">Remember me</span>
                </label>
                <a href="/forgot-password" className="forgot-password">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={submitting || Object.keys(errors).length > 0}
              >
                {submitting ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="footer-text">
            Need help? <a href="/support" className="footer-link">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;