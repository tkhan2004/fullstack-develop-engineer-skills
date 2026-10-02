# security/

Security-specific material. Keep it separate because it has the strictest accuracy
requirements and the fastest-moving threat landscape.

| File                   | Source                    | Licence                | Feeds                                         |
| ---------------------- | ------------------------- | ---------------------- | --------------------------------------------- |
| `owasp-top-10.md`      | OWASP Top 10              | CC BY-SA 4.0           | engineering/security                          |
| `owasp-api-top-10.md`  | OWASP API Security Top 10 | CC BY-SA 4.0           | engineering/security, architecture/api-design |
| `owasp-asvs.md`        | OWASP ASVS                | CC BY-SA 4.0           | engineering/security, doctor checks           |
| `owasp-cheatsheets.md` | OWASP Cheat Sheet Series  | CC BY-SA 4.0           | engineering/security                          |
| `nist-800-63b.md`      | NIST SP 800-63B           | public domain (US gov) | authentication rules                          |
| `cwe-top-25.md`        | MITRE CWE                 | —                      | finding taxonomy                              |

Rules for this directory:

1. **Attribution matters** — OWASP material is CC BY-SA; attribute it wherever derived rules
   appear, and note the share-alike implication before copying any wording.
2. **Cite the edition and year.** "OWASP Top 10" without a year is not a citation.
3. **Prefer ASVS phrasing** as raw material: it is already written as verifiable requirements.
4. **No exploit code** in notes or skills. Rules describe the defect and the defence.
5. Security rules in skills MUST be concrete: which input, which boundary, which check.
