<#import "template.ftl" as layout>
<@layout.emailLayout>
<p>Dear ${user.firstName!"User"},</p>
<p>A new AIOT account has been registered with this email address (${user.email}). If it is you who initiated this registration, please verify your email address by clicking the link below:</p>
<p><a href="${link}">Verify Email Address</a></p>
<p>This link will expire in ${linkExpirationFormatter(linkExpiration)}.</p>
<p>Please ignore this message if its not you.</p>
<p>Thank you,<br>Autonomous ITOps Toolkit Team</p>
</@layout.emailLayout>

