import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import "./SignIn.css";
import lottie from 'lottie-web';
import animationData from '../../../images/login with account (1).json';
import omniLogo from '../../../images/OmniLogo.png';
import animatedData2 from '../../../images/Login (2).json';

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const lottieContainer = useRef(null);
  const leftLottieRef = useRef(null);

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
      await new Promise((res) => setTimeout(res, 600));
      console.log("Login payload:", { email, password, rememberMe });

      navigate('/admin');
    } catch {
      setServerError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="signin-container">
      {/* Left side with Lottie animation */}
      <div className="left-side">
        <div className="animation-container" ref={leftLottieRef} />
      </div>

      {/* Right side with login form */}
      <div className="right-side">
        {/* Logo in top left corner */}
        <div className="logo-container">
          <img src={omniLogo} alt="Omni Logo" className="logo" />
        </div>

        <div className="login-card-container">
          <div className="login-card">
            <div className="card-header">
              <h1 className="welcome-title">Welcome to Materio!</h1>
              <p className="welcome-subtitle">
               
              </p>
            </div>

            {serverError && (
              <div className="server-error" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <div className="input-wrapper">
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    aria-invalid={!!errors.email}
                    className={errors.email && touched.email ? 'error' : ''}
                  />
                  {touched.email && errors.email && (
                    <div className="error-message" role="alert">
                      {errors.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password:</label>
                <div className="input-wrapper">
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      aria-invalid={!!errors.password}
                      className={errors.password && touched.password ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="show-password-btn"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {touched.password && errors.password && (
                    <div className="error-message" role="alert">
                      {errors.password}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Remember Me
                </label>
                <a href="/forgot-password" className="forgot-password">
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={submitting || Object.keys(errors).length > 0}
              >
                {submitting ? "Signing in..." : "LOGIN"}
              </button>

             

         
            </form>
          </div>
        </div>

        {/* Bottom animation */}
       
      </div>
    </div>
  );
};

export default SignIn;