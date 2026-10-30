<#import "template.ftl" as layout>
<@layout.registrationLayout displayInfo=true displayMessage=false; section>

  <#if section = "header">
    <span style="display:none;">Autonomous ITOps Toolkit</span>

  <#elseif section = "form">
  <div class="aiot-page">

    <aside class="brand-panel">
      <div class="brand-bg-dots"></div>
      <div class="brand-glow brand-glow--1"></div>
      <div class="brand-glow brand-glow--2"></div>
      <div class="brand-inner">
        <div class="brand-logo">
          <img src="${url.resourcesPath}/img/logo.png" alt="Cognizant"
               onerror="this.src='${url.resourcesPath}/img/logo.svg'; this.onerror=null;" />
        </div>
        <div class="brand-hero">
          <p class="brand-eyebrow">Transform Your IT Operations with</p>
          <h1 class="brand-title">Autonomous <span class="brand-title--cyan">ITOps</span> Toolkit</h1>
          <p class="brand-desc">A unified, AI-powered toolkit to automate, optimize, and scale IT operations. Enable intelligent workflows, faster resolution, and resilient operations.</p>
        </div>
        <p class="brand-copy">© Cognizant. All rights reserved.</p>
      </div>
    </aside>

    <main class="form-panel">
      <div class="form-inner">

        <div class="form-hd">
          <div class="form-hd__bar"></div>
          <h2 class="form-hd__title">Verify your email</h2>
          <p class="form-hd__sub">One more step to activate your account</p>
        </div>

        <div class="info-card">
          <div class="info-card__icon info-card__icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <p class="info-card__msg">
            An email has been sent to <strong>${(user.email!'your email address')}</strong> with a link to verify your account.
            Please check your inbox and click the link to continue.
          </p>
          <p class="info-card__hint">
            Didn't receive it? Check your spam folder or
            <a href="${url.loginAction}" class="f-link">resend the email</a>.
          </p>
        </div>

        <p class="f-register">
          <a href="${url.loginUrl}" class="f-link">Back to Sign In</a>
        </p>

      </div>
    </main>

  </div>
  </#if>
</@layout.registrationLayout>
