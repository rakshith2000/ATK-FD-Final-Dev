<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>

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
          <div class="form-hd__bar" style="background:linear-gradient(90deg,#f59e0b,#f97316);"></div>
          <h2 class="form-hd__title">Page expired</h2>
          <p class="form-hd__sub">Your session has timed out</p>
        </div>

        <div class="info-card">
          <div class="info-card__icon info-card__icon--warn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
            </svg>
          </div>
          <p class="info-card__msg">
            This page is no longer valid. Your login session may have expired or the link has already been used.
          </p>
        </div>

        <div class="expired-actions">
          <a href="https://demo.autonomousitopstoolkit.com/login" class="f-btn" style="text-decoration:none;display:flex;">
            Restart Login
            <svg viewBox="0 0 20 20" fill="currentColor" style="width:17px;height:17px;">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </a>
          <#if client?? && client.baseUrl?has_content>
          <a href="${client.baseUrl}" class="f-sso-btn" style="text-decoration:none;display:flex;margin-top:12px;">
            Back to Application
          </a>
          </#if>
        </div>

      </div>
    </main>

  </div>
  </#if>
</@layout.registrationLayout>
