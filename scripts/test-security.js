#!/usr/bin/env node
// scripts/test-security.js - Security Vulnerability Testing

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 SECURITY VULNERABILITY TESTING');
console.log('===================================\n');

class SecurityTester {
  constructor() {
    this.vulnerabilities = [];
    this.scannedFiles = 0;
    this.securityIssues = {
      high: [],
      medium: [],
      low: []
    };
  }

  /**
   * Scan for common security vulnerabilities
   */
  async scanSecurityVulnerabilities() {
    console.log('🔍 Scanning for Security Vulnerabilities...\n');

    await this.scanForSQLInjection();
    await this.scanForXSSVulnerabilities();
    await this.scanForCSRFVulnerabilities();
    await this.scanForInsecureAuthentication();
    await this.scanForSensitiveDataExposure();
    await this.scanForInputValidation();
    await this.scanForInsecureFileHandling();
    await this.scanForWeakCryptography();
  }

  /**
   * Scan for SQL Injection vulnerabilities
   */
  async scanForSQLInjection() {
    console.log('🛡️  Scanning for SQL Injection vulnerabilities...');

    const patterns = [
      /\$\{[^}]*\}.*query|query.*\$\{[^}]*\}/i,
      /['"`]\s*\+\s*\w+|['"`]\s*\+\s*req\.|req\..*\+.*['"`]/i,
      /db\.query\([^)]*\+|query\([^)]*\+/i,
      /WHERE.*=.*\$\{|SET.*=.*\$\{/i
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('high', {
              type: 'SQL Injection',
              file: filePath,
              issue: 'Potential SQL injection vulnerability detected',
              pattern: pattern.toString(),
              recommendation: 'Use parameterized queries or ORM with built-in escaping'
            });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} potential SQL injection issues`);
    console.log('');
  }

  /**
   * Scan for XSS vulnerabilities
   */
  async scanForXSSVulnerabilities() { console.log('🛡️  Scanning for XSS vulnerabilities...');

    const patterns = [
      /dangerouslySetInnerHTML/i,
      /innerHTML\s*=\s*[^;]*req\.|innerHTML\s*=\s*[^;]*\$\{/i,
      /document\.write\(/i,
      /eval\s*\([^)]*req\.|eval\s*\([^)]*\$\{/i,
      /res\.send\([^)]*req\./i,
      /res\.json\([^)]*req\./i
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('high', {
              type: 'XSS Vulnerability',
              file: filePath,
              issue: 'Potential XSS vulnerability detected',
              pattern: pattern.toString(),
              recommendation: 'Sanitize user input, use DOMPurify or similar library'
             });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} potential XSS issues`);
    console.log('');
  }

  /**
   * Scan for CSRF vulnerabilities
   */
  async scanForCSRFVulnerabilities() {
    console.log('🛡️  Scanning for CSRF vulnerabilities...');

    const files = await this.findAPIRoutes();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for POST/PUT/DELETE without CSRF protection
        const hasPostPutDelete = /export\s+async\s+function\s+(POST|PUT|DELETE)/i.test(content);
        const hasCSRFProtection = /csrf|token|nonce/i.test(content);
        
        if (hasPostPutDelete && !hasCSRFProtection) {
          this.addSecurityIssue('medium', {
            type: 'CSRF Vulnerability',
            file: filePath,
            issue: 'API route without CSRF protection',
            recommendation: 'Implement CSRF token validation for state-changing operations'
          });
          issues++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} potential CSRF issues`);
    console.log('');
  }

  /**
   * Scan for insecure authentication
   */
  async scanForInsecureAuthentication() {
    console.log('🛡️  Scanning for authentication issues...');

    const patterns = [
      /password.*===.*req\.|password.*==.*req\./i,
      /bcrypt\.compare\(.*req\./i,
      /jwt\.sign\([^,)]*,[^,)]*,\s*\{\}/i, // JWT without expiration
      /localStorage.*password|sessionStorage.*password/i,
      /console\.log.*password|console\.log.*token/i
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('high', {
              type: 'Authentication Vulnerability',
              file: filePath,
              issue: 'Insecure authentication practice detected',
              pattern: pattern.toString(),
              recommendation: 'Use secure authentication methods, avoid logging sensitive data'
            });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} authentication issues`);
    console.log('');
  }

  /**
   * Scan for sensitive data exposure
   */
  async scanForSensitiveDataExposure() {
    console.log('🛡️  Scanning for sensitive data exposure...');

    const patterns = [
      /console\.log.*password|console\.log.*secret|console\.log.*token/i,
      /console\.log.*api[_-]?key|console\.log.*private/i,
      /alert.*password|alert.*token|alert.*secret/i,
      /localStorage.*password|localStorage.*secret/i,
      /sessionStorage.*password|sessionStorage.*secret/i
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('medium', {
              type: 'Sensitive Data Exposure',
              file: filePath,
              issue: 'Sensitive data potentially exposed in logs or storage',
              pattern: pattern.toString(),
              recommendation: 'Remove sensitive data from logs and client-side storage'
            });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} data exposure issues`);
    console.log('');
  }

  /**
   * Scan for input validation issues
   */
  async scanForInputValidation() {
    console.log('🛡️  Scanning for input validation issues...');

    const files = await this.findAPIRoutes();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if API routes have input validation
        const hasPostPutPatch = /export\s+async\s+function\s+(POST|PUT|PATCH)/i.test(content);
        const hasValidation = /joi|yup|zod|validate|schema/i.test(content);
        
        if (hasPostPutPatch && !hasValidation) {
          this.addSecurityIssue('medium', {
            type: 'Input Validation',
            file: filePath,
            issue: 'API route without input validation',
            recommendation: 'Implement input validation using Joi, Zod, or similar library'
          });
          issues++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} input validation issues`);
    console.log('');
  }

  /**
   * Scan for insecure file handling
   */
  async scanForInsecureFileHandling() {
    console.log('🛡️  Scanning for file handling issues...');

    const patterns = [
      /fs\.readFile\([^)]*req\.|fs\.writeFile\([^)]*req\./i,
      /path\.join\([^)]*req\.|path\.resolve\([^)]*req\./i,
      /multer.*dest.*req\./i,
      /upload.*filename.*req\./i
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('high', {
              type: 'Insecure File Handling',
              file: filePath,
              issue: 'Potential path traversal or file upload vulnerability',
              pattern: pattern.toString(),
              recommendation: 'Validate file paths and names, restrict upload file types'
            });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} file handling issues`);
    console.log('');
  }

  /**
   * Scan for weak cryptography
   */
  async scanForWeakCryptography() {
    console.log('🛡️  Scanning for cryptography issues...');

    const patterns = [
      /md5|sha1/i, // Weak hash functions
      /crypto\.createCipher\(/i, // Deprecated function
      /Math\.random\(\).*password|Math\.random\(\).*token/i,
      /btoa\(.*password|atob\(.*password/i // Base64 encoding (not encryption)
    ];

    const files = await this.findJSFiles();
    let issues = 0;

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.addSecurityIssue('medium', {
              type: 'Weak Cryptography',
              file: filePath,
              issue: 'Weak cryptographic method detected',
              pattern: pattern.toString(),
              recommendation: 'Use strong cryptographic functions (bcrypt, scrypt, SHA-256+)'
            });
            issues++;
          }
        });
      } catch (error) {
        // Skip files that can't be read
      }
    }

    console.log(`   Found ${issues} cryptography issues`);
    console.log('');
  }

  /**
   * Add security issue
   */
  addSecurityIssue(severity, issue) {
    this.securityIssues[severity].push({
      ...issue,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Find all JavaScript files
   */
  async findJSFiles() {
    const files = [];
    const rootDir = path.join(__dirname, '..');
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item === 'coverage') continue;
        
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(rootDir);
    this.scannedFiles = files.length;
    return files;
  }

  /**
   * Find API route files
   */
  async findAPIRoutes() {
    const files = [];
    const apiDir = path.join(__dirname, '..', 'app', 'api');
    
    if (!fs.existsSync(apiDir)) return files;
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && item === 'route.js') {
          files.push(fullPath);
        }
      }
    };
    
    scanDir(apiDir);
    return files;
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    console.log('🔒 SECURITY VULNERABILITY REPORT');
    console.log('=================================\n');

    const totalIssues = this.securityIssues.high.length + 
                       this.securityIssues.medium.length + 
                       this.securityIssues.low.length;

    console.log(`📊 Scan Summary:`);
    console.log(`   Files Scanned: ${this.scannedFiles}`);
    console.log(`   Total Issues: ${totalIssues}`);
    console.log(`   🚨 High Severity: ${this.securityIssues.high.length}`);
    console.log(`   ⚠️  Medium Severity: ${this.securityIssues.medium.length}`);
    console.log(`   ℹ️  Low Severity: ${this.securityIssues.low.length}`);
    console.log('');

    // High severity issues (must fix)
    if (this.securityIssues.high.length > 0) {
      console.log('🚨 HIGH SEVERITY ISSUES (Fix Immediately):');
      this.securityIssues.high.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.type}`);
        console.log(`      File: ${path.relative(__dirname, issue.file)}`);
        console.log(`      Issue: ${issue.issue}`);
        console.log(`      Fix: ${issue.recommendation}`);
        console.log('');
      });
    }

    // Medium severity issues (should fix)
    if (this.securityIssues.medium.length > 0) {
      console.log('⚠️  MEDIUM SEVERITY ISSUES (Should Fix):');
      this.securityIssues.medium.slice(0, 5).forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.type}`);
        console.log(`      File: ${path.relative(__dirname, issue.file)}`);
        console.log(`      Issue: ${issue.issue}`);
        console.log(`      Fix: ${issue.recommendation}`);
        console.log('');
      });
      
      if (this.securityIssues.medium.length > 5) {
        console.log(`   ... and ${this.securityIssues.medium.length - 5} more medium issues`);
      }
    }

    // Security recommendations
    console.log('🛡️  GENERAL SECURITY RECOMMENDATIONS:');
    console.log('   1. Implement Content Security Policy (CSP)');
    console.log('   2. Use HTTPS in production');
    console.log('   3. Implement rate limiting');
    console.log('   4. Add security headers (helmet.js)');
    console.log('   5. Regular dependency updates');
    console.log('   6. Input sanitization and validation');
    console.log('   7. Secure authentication practices');
    console.log('   8. Regular security audits');
    console.log('');

    // Security score
    const securityScore = Math.max(0, 100 - (
      this.securityIssues.high.length * 10 +
      this.securityIssues.medium.length * 5 +
      this.securityIssues.low.length * 2
    ));

    console.log(`🎯 Security Score: ${securityScore}/100`);
    
    if (securityScore >= 90) {
      console.log('✅ Excellent security posture!');
    } else if (securityScore >= 75) {
      console.log('👍 Good security, minor improvements needed');
    } else if (securityScore >= 50) {
      console.log('⚠️  Fair security, several issues need attention');
    } else {
      console.log('🚨 Poor security, immediate action required');
    }

    return {
      score: securityScore,
      issues: totalIssues,
      high: this.securityIssues.high.length,
      medium: this.securityIssues.medium.length,
      low: this.securityIssues.low.length
    };
  }
}

// Run security testing
async function runSecurityTests() {
  const tester = new SecurityTester();
  
  await tester.scanSecurityVulnerabilities();
  const report = tester.generateSecurityReport();
  
  return report;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests()
    .then(report => {
      process.exit(report.high === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security test suite failed:', error);
      process.exit(1);
    });
}

export default SecurityTester;