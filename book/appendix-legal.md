# Appendix: The Legal Framework in Detail

> This appendix supports the tax chapters, Chapter 2 on the Foreign Earned Income Exclusion (FEIE) and Chapter 4 on Mexican tax residency. (The book has no Chapter 5; the material was renumbered, and cross-references that once pointed to a "Chapter 5" now point here.)

This appendix provides the full legal analysis supporting the strategies described in the tax chapters. It covers Mexican domestic law, the U.S.-Mexico Tax Treaty, entity classification mechanics, SAT enforcement capabilities, and common questions. None of it is individualized advice. It is a map of the machinery, meant to be read alongside a qualified cross-border CPA and, where the stakes call for one, a Mexican tax attorney.

## Mexican Domestic Law: How Residency Is Determined

Mexican tax residency is governed by Article 9 of the Código Fiscal de la Federación (Federal Tax Code, or CFF):

- **Primary rule.** An individual who has established their primary home (casa habitación) in Mexico is a Mexican tax resident.
- **Dual-home rule.** If the individual also has a home in another country, residency is determined by where the individual's "center of vital interests" (centro de intereses vitales) is located.
- **Center of vital interests** is in Mexico if either: (a) more than 50% of the individual's total income in a calendar year comes from Mexican sources, OR (b) Mexico is the primary place of the individual's professional activities.

### Prong 1: Income Source

A critical caveat: under Mexican domestic tax law (LISR), income is technically sourced to where the labor is physically performed. If you are physically typing on a laptop in Puerto Vallarta for 340 days, SAT will likely view that labor as generating Mexican-source income for domestic testing purposes, even if the client and bank account are in the U.S. Because of this, you will likely lose the domestic center-of-vital-interests argument.

This is exactly why the treaty is your safety net. The U.S. dwelling ensures that when you lose the domestic test, you immediately trigger the U.S.-Mexico Tax Treaty tie-breaker (Article 4), which looks at your broader economic and personal relations rather than just the physical sourcing of your daily labor.

### Prong 2: Professional Activities

This prong evaluates whether Mexico is the primary place of your professional activities. For someone whose clients are exclusively U.S.-based, whose contracts are governed by U.S. law, and whose business infrastructure operates through U.S. systems, the professional activities are centered in the U.S., even if some of the physical labor is performed from Mexico. However, a strict location-based reading could point the other direction for someone spending most of the year in Mexico. This is where documentation of your U.S.-centered professional infrastructure matters.

### Income Sourcing: A Technical Note

Residency determines where you are taxed as a tax resident on worldwide income. Sourcing determines which country can tax specific categories of income, even for non-residents. These are parallel frameworks that interact but do not override each other.

Under LISR, earned income is technically sourced to where labor is physically performed. CFF Article 9's center-of-vital-interests test evaluates something different: where your economic life is centered, meaning the overall pattern of income sources, banking, contracts, and professional relationships.

## The U.S.-Mexico Tax Treaty: Tie-Breaker Rules

When both countries could claim you as a tax resident, the treaty provides a sequential tie-breaker under Article 4:

1. **Permanent home.** Resident of the country where you have a permanent home available. If both, proceed to Step 2.
2. **Center of vital interests.** Resident of the country where your personal and economic relations are closer.
3. **Habitual abode.** Where you habitually reside.
4. **Nationality.** As a U.S. citizen, resolves in your favor.
5. **Mutual agreement.** Competent authorities negotiate.

The treaty's "saving clause" (Article 1, Paragraph 3) preserves the U.S. right to tax its citizens regardless of treaty residency. You cannot use the treaty to escape U.S. taxation, but you can use it to resolve which country has primary taxing rights.

## How the Treaty Taxes Different Income Types

Even as a treaty non-resident of Mexico, you may still owe Mexican tax on income from services performed there. The treaty contains three articles that matter.

### Article 14: Independent Personal Services

Governs freelancers, consultants, independent contractors. Mexico can tax if either:

- (a) **Fixed base:** You have a fixed base in Mexico that you regularly use; OR
- (b) **183 days:** You are present in Mexico for 183+ days in a rolling 12-month period.

Either trigger is independently sufficient.

### Article 15: Dependent Personal Services (Employment)

Governs W-2 employment income. Mexico can tax unless all three conditions are met:

- (a) Present fewer than 183 days in a rolling 12-month period; AND
- (b) Paid by a non-Mexican employer; AND
- (c) Not borne by a Mexican PE.

For U.S.-employed readers with no Mexican operations, (b) and (c) are met. The vulnerability is (a): 183+ days eliminates the exemption.

### Article 7: Business Profits

Governs enterprise profits. Mexico can tax only if attributable to a Mexican permanent establishment (PE). No day-count threshold; purely qualitative. Applies to corporate entities (S-Corps, C-Corps).

### Protocol 1, Paragraph 14: The Company Extension

This provision extends Article 14's fixed-base prong to companies, but not the 183-day prong, which applies to "an individual." Article 5 defines PE for enterprises; Article 14 uses the parallel concept of a "fixed base" for individuals, essentially the individual equivalent of a PE.

## Entity Classification: How Business Structure Affects Treaty Treatment

### Sole Proprietor / Single-Member LLC

You are the taxpayer. Article 14 applies. Mexico can tax if you have a fixed base OR spend 183+ days. The 183-day rule applies to you directly.

### W-2 Employee of a U.S. Company

Article 15 applies. Mexico can tax your wages unless all three exemption conditions are met. Spending 183+ days breaks condition (a).

### S-Corp Owner Performing Services

The S-Corp's (or LLC taxed as an S-Corp) income splits into two streams:

- **Your W-2 salary:** Personal services compensation. Falls under Article 15 (or 14). The 183-day threshold applies to you as the individual.
- **S-Corp distributions:** Business profits of the entity. The S-Corp is a U.S. body corporate with no Mexican PE. Under Article 7, no PE means no Mexican tax on distributions.

This analysis assumes Mexico respects the U.S. entity classification. Under U.S. law, S-Corps are pass-throughs, but for treaty purposes an S-Corp is a body corporate (Article 3). If SAT examined this deeply, they might argue the entity is a conduit. That argument is weak under the treaty text but not impossible.

### C-Corp Owner

Similar to S-Corp. Business profits fall under Article 7. Your salary falls under Article 15 or 14. Adds double U.S. taxation (corporate plus dividend tax) that does not exist with an S-Corp.

### Entity Classification Summary

| Structure | Treaty Article | Mexican Tax Trigger | 183-Day Rule? | PE Test? |
| --- | --- | --- | --- | --- |
| Sole proprietor | Art. 14 | Fixed base OR 183 days | Yes | No (fixed base) |
| Single-member LLC | Art. 14 | Fixed base OR 183 days | Yes | No (fixed base) |
| W-2 employee | Art. 15 | 183 days plus employer tests | Yes | N/A |
| S-Corp (salary) | Art. 14 or 15 | 183 days (individual) | Yes | N/A for salary |
| S-Corp (distributions) | Art. 7 | PE only | No | Yes; no PE means no tax |
| C-Corp (salary) | Art. 14 or 15 | 183 days (individual) | Yes | N/A for salary |
| C-Corp (profits) | Art. 7 | PE only | No | Yes; no PE means no tax |

**Key takeaway.** No structure provides a complete exemption from the 183-day rule for the individual performing services. An S-Corp or C-Corp splits income into two streams: personal services compensation (exposed) and business profits (protected by the PE test). IRS reasonable-compensation rules limit how low salary can go.

## The Permanent Establishment (PE) Risk for Business Owners

Under Article 5, a PE is a fixed place of business through which a business is carried on. If your U.S. company has a PE in Mexico, profits attributable to it are taxable, potentially triggering corporate income tax (30%) and VAT (Value Added Tax).

For a solo owner with all U.S. clients, no Mexican revenue, and no commercial reason tied to Mexico, the PE argument is weak. There is no day-count trigger for PE under Article 5 for service businesses. The PE test is qualitative: does the business have a commercial connection to Mexico?

If you serve Mexican clients, employ Mexican workers, or derive Mexican revenue, consult a cross-border tax professional. A PE changes the entire analysis.

### The Leverage Defense: U.S.-Based Contractors

If you have U.S.-based employees or contractors performing substantial work for your company, document this. It is one of your strongest structural defenses against PE and POEM risks. Showing invoices, deliverables, and communications from U.S. contractors proves the economic engine of the company remains in the United States. A U.S. team also justifies a lower "reasonable compensation" salary under IRS rules, because you are no longer doing all the work. A lower required salary means a smaller theoretical Mexican tax exposure.

However, this does not eliminate your personal tax exposure. If you draw a $70,000 salary, that compensation is for the labor you performed. If you were physically in Mexico while performing the executive oversight that earned that salary, that income stream remains theoretically exposed and must be accounted for in your reserve strategy.

## SAT Enforcement: The Full Picture

SAT's 2026 Master Plan: 16,200+ audits focused on corporations, large taxpayers, foreign trade, false invoicing, and transfer pricing (367% revenue increase from 2019 to 2024). Individual foreign nationals with no RFC, no CFDIs, and no Mexican accounts receiving income present a minimal profile. This is current reality, not a guarantee of future posture. Enforcement posture evolves with policy priorities, data-sharing agreements, and technological capabilities.

As of early 2026, extensive research across English-language and Spanish-language tax forums, expat communities, cross-border tax practitioner publications, and public SAT enforcement records has not identified a single documented case of SAT initiating a tax assessment against a U.S. expat earning exclusively U.S.-source income with no Mexican RFC or tax filings. This does not mean it has never happened; it means no public record of it could be found. This observation informs the probability assessment but does not eliminate the theoretical exposure. Enforcement posture can change without warning.

### What Minimizes Your Audit Profile

- Hold only a CURP, not an RFC
- No Mexican accounts receiving income
- No Mexican invoices (CFDI)
- No Mexican employment or payroll
- No Mexican rental income
- No Mexican address as fiscal domicile
- Pay local expenses with foreign cards or cash

### What SAT Can and Cannot See

SAT can verify your physical presence through immigration entry and exit records. If you spent 340 days in Mexico, SAT can confirm that.

Via the treaty's information-exchange provisions (Article 27), SAT can request your U.S. tax returns and financial account data from the IRS. This produces your W-2, S-Corp return, income figures, and U.S. address. Notably, a W-2 does not contain a location-of-work field. Nothing on your U.S. tax returns indicates where the labor was physically performed.

What SAT cannot do: under Mexico's constitutional framework, SAT has no extraterritorial enforcement power. It cannot compel U.S.-based companies, service providers, or clients to produce records. It cannot subpoena your email provider, your project-management software, your calendar, or your login history. There is no current mechanism, such as a CLOUD Act executive agreement between the U.S. and Mexico, that would enable SAT to request the U.S. government to obtain your work-activity records on its behalf for a civil tax matter.

The practical result: SAT can establish that you were in Mexico. It cannot independently establish what you did while there. SAT does not need perfect visibility to challenge your position; they rely on presence, patterns, and inconsistencies. The constraint is not what SAT can prove; it is whether your position remains coherent under scrutiny. This section describes the evidentiary landscape to help you understand the practical weight of your documentation, not to suggest that any representation to a tax authority should be anything other than truthful.

### What Failure Actually Looks Like: The Full Sequence

SAT cross-references immigration entry and exit records with its RFC database. A foreign national who appears in Mexico 300+ days per year with no RFC, no tax filings, and no Mexican employer is not currently a priority, but if flagged:

1. **The notification.** SAT sends a request for information (requerimiento) to the address on file, which for someone without an RFC may route through immigration records or a known Mexican address.
2. **The documentation request.** You are asked to prove you are not a Mexican tax resident, or that your income is exempt under the treaty. If you have a U.S. dwelling lease, U.S. tax returns, U.S. contracts, and travel records, you respond with a position. If you do not, you are assembling a defense retroactively, which is always weaker.
3. **The narrative mismatch.** SAT reviews your claim about limited work activity in Mexico. Meanwhile, your IRS filings show you as the sole officer of an S-Corp earning $150,000. Without the documentation described in the worked example (no delegation of management authority, no evidence of U.S.-based operational execution), SAT may attribute full-time work to your Mexican presence. The theoretical exposure jumps from your documented attribution to $21,000 (on 100% of salary).
4. **The assessment.** SAT issues a tax assessment based on their interpretation. With no reserve, you are facing a five-figure liability plus penalties and interest, potentially across multiple years, with limited time to respond.

This is not a common scenario under current enforcement priorities. But every element of it is mechanically possible.

## Common Questions

### Does my immigration status create tax residency?

No. Immigration and tax residency are legally distinct. A residente temporal or permanente card does not create tax residency. Your CURP is not a tax registration; an RFC is. Whether to obtain an RFC depends on your facts and should be discussed with your tax advisor.

### Does a Mexican bank account create tax residency?

A peso account for local expenses (utilities, groceries, household) funded with small cash deposits or U.S. debit-card transfers is routine consumer activity. It does not constitute economic establishment under the center-of-vital-interests test. The account should not receive client payments, business income, or investment income. Note: a Mexican bank account is not necessary; we lived in Mexico three years without one.

### Does owning Mexican property create tax residency?

Not if used personally and not rented commercially. If you rent it out, you are generating Mexican-source income that creates data points within SAT's systems and weakens your center-of-vital-interests position.

### What about the Bona Fide Residency (BFR) test and Mexican tax status?

Review the Federal Income Tax chapter (Chapter 2) before this section.

IRC Section 911(d)(5): if you submit a statement to a foreign country's authorities that you are not a resident, and those authorities hold that you are not subject to their income tax laws, you cannot claim BFR for FEIE. This requires two elements: (1) an affirmative statement, AND (2) a holding by those authorities. If SAT never responded, the second element is not satisfied. Simply not filing or not registering for an RFC is not "submitting a statement." The Physical Presence Test is the safer FEIE path for expats not engaging with SAT.

## The Annual U.S. Visit: Details

Your annual U.S. visit is maintenance on your tax infrastructure. Periodic returns demonstrate your dwelling is real, reinforce your center-of-vital-interests position, create documented presence patterns, and keep you within Physical Presence Test (PPT) requirements (up to 35 days per year in the U.S.).

Both spouses claim FEIE? Each position is evaluated independently. Both need domicile documentation. Each should visit the U.S. at least once per year.

Missed a year? Domicile persists. PPT is helped by zero U.S. days. The income prong does not depend on physical presence. But you are relying on one layer instead of several. One missed year in a decade is a footnote; three consecutive years starts to look like the dwelling exists on paper but not in practice.

## The Fair-Share Question

At some point, someone (a friend, a family member, a fellow expat, or your own conscience) will ask whether living in Mexico while minimizing tax obligations to both countries is ethically defensible. Here is how the system is actually designed. The U.S. taxes based on citizenship. Mexico taxes based on residency and economic presence. Treaties resolve the overlap. Most expats contribute to Mexico through consumption (rent, services, food, domestic labor), generating VAT, payroll, and corporate tax revenue. Mexico's center-of-vital-interests test is intentionally flexible, attracting mobile professionals whose income is earned elsewhere but spent locally.

## Documentation: Your Full Defense Package

- U.S. tax returns showing worldwide income reported
- U.S. employer or client contracts
- U.S. bank statements showing income deposits
- U.S. investment account statements
- U.S. driver's license and voter registration
- Lease or agreement documenting U.S. dwelling
- Travel records showing periodic U.S. returns
- Professional licenses held in U.S. states
- Officer Delegation of Management Authority memorandum (if operating through an S-Corp or LLC)

This package demonstrates your economic life is centered in the United States.

## Federal Income Tax Resources

### FEIE Resources

**Forms and Publications:**

- IRS Form 2555, Foreign Earned Income Exclusion
- IRS Publication 54, Tax Guide for U.S. Citizens Abroad
- Form 4868, Application for Automatic Extension

**Recommended Tools:**

- Travel-tracking apps (TaxDay, TripIt)
- Expat tax software (MyExpatTaxes, Greenback)
- Google Timeline (for location history)

**Professional Resources:**

- Directory of expat-focused CPAs
- FEIE audit-defense attorneys
- Cross-border tax advisors

## Primary Legal and Regulatory Sources

These are the author's reference citations, preserved as compiled. For links confirmed against the primary authorities, see the Sources section below.

**1. Internal Revenue Code (IRC)**

- Section 911, Citizens or residents of the United States living abroad
- IRC Section 911(a), Exclusion from gross income
- IRC Section 911(b), Foreign earned income defined
- IRC Section 911(c), Housing cost amount
- IRC Section 911(d), Definitions and special rules
- Citation format: Internal Revenue Code Section 911, 26 U.S.C. § 911

**2. Treasury Regulations**

- 26 CFR 1.911-1 through 1.911-7
- 1.911-2(a), Earned income defined
- 1.911-2(c), Physical presence test
- 1.911-2(d), Bona fide residence test
- 1.911-3, Determination of tax home
- 1.911-4, Foreign earned income exclusion
- 1.911-5, Foreign housing exclusion and deduction
- Citation format: Treas. Reg. § 1.911-2(c) (as amended in 2006)

**3. IRS Publications and Forms**

- IRS Publication 54, Tax Guide for U.S. Citizens and Resident Aliens Abroad (current edition, updated annually). Available at www.irs.gov/pub/irs-pdf/p54.pdf
- Form 2555, Foreign Earned Income, with Instructions for Form 2555 (current year). Available at www.irs.gov/forms-pubs/about-form-2555
- Form 4868, Application for Automatic Extension of Time to File. Available at www.irs.gov/forms-pubs/about-form-4868

### Exclusion Amount Sources

**4. Annual Exclusion Limits**

- IRS Revenue Procedures (annual updates)
- Rev. Proc. 2024-40 (for 2025 tax-year amounts)
- Rev. Proc. 2023-34 (for 2024 tax-year amounts)
- Published in the Internal Revenue Bulletin
- 2025 exclusion amount: $130,000 (single), $260,000 (married if both qualify). Source: IRS Revenue Procedure 2024-40, Section 3.28

### Physical Presence Test Sources

**5. 330-Day Rule Authority**

- Treasury Regulation 1.911-2(d)(1): definition of 330 full days, 12-month period requirements, travel-day calculations
- IRS Publication 54, Chapter 4: examples of qualifying periods, day-counting methodology, travel between foreign countries

**6. Case Law on Physical Presence**

- Sochurek v. Commissioner, 300 F.2d 34 (7th Cir. 1962), physical presence definition
- Arnett v. Commissioner, 473 F.2d 2 (5th Cir. 1973), day-counting rules
- Papineau v. Commissioner, T.C. Memo 1983-411, travel-day treatment

### Bona Fide Residency Test Sources

**7. Bona Fide Residency Authority**

- Treasury Regulation 1.911-2(c): definition of bona fide residence, intent to remain indefinitely, integration into foreign community
- IRS Publication 54, Chapter 3: factors considered for bona fide residence, examples of qualifying situations, tax-home requirements

**8. Case Law on Bona Fide Residency**

- Burgess v. Commissioner, 8 T.C. 47 (1947), intent requirement
- Sochurek v. Commissioner, 42 T.C. 716 (1964), community integration
- Morrison v. Commissioner, 44 T.C. 563 (1965), tax-home establishment

### Mexican Tax Law Sources

**9. Mexican Income Tax Law**

- Ley del Impuesto Sobre la Renta (LISR)
- Article 1, tax residency definition
- Article 9, center-of-vital-interests test
- Article 10, 183-day rule
- Citation: Ley del Impuesto Sobre la Renta, Diario Oficial de la Federación

**10. U.S.-Mexico Tax Treaty**

- Convention Between the United States and Mexico for the Avoidance of Double Taxation
- Article 4, resident definition and tie-breaker rules
- Article 15, employment income
- Available at www.irs.gov/pub/irs-trty/mexico.pdf

### Audit Statistics Sources

**11. IRS Data Books and Statistical Reports**

- IRS Data Book (annual Publication 55B), Table 9a, Examination Coverage by Return Type; international return audit statistics. Available at www.irs.gov/statistics/soi-tax-stats-irs-data-book
- Statistics of Income Division reports: international income and taxes reported by U.S. persons. Available at www.irs.gov/statistics

**12. Professional Analysis Sources**

- American Institute of CPAs (AICPA), International Tax Practice Guides. Available at www.aicpa.org
- Expat tax professional organizations: professional surveys and trend analysis, case-study compilations

### Documentation Requirements Sources

**13. IRS Examination Guidelines**

- IRS Internal Revenue Manual (IRM), Section 4.60.1, International Examinations
- IRS Internal Revenue Manual (IRM), Section 4.60.2, Foreign Earned Income Exclusion
- Available at www.irs.gov/irm/
- IRS Publication 1459, How to Appeal an IRS Decision: audit-response procedures, documentation requirements

*(See the "To verify" section below regarding the current titles of these IRM sections.)*

### Housing Exclusion Sources

**14. Foreign Housing Exclusion Authority**

- IRC Section 911(c), housing cost amount
- Treasury Regulation 1.911-4: qualified housing expenses, base housing amount calculations, high-cost locality adjustments
- IRS Notice 2024-XX (annual updates): base housing amounts by location, high-cost area designations

### Self-Employment Tax Sources

**15. SE Tax on Foreign Income**

- IRC Section 1402(a)(1), net earnings from self-employment
- Revenue Ruling 91-58, SE tax applies to excluded foreign income
- IRS Publication 533, Self-Employment Tax

### S-Corporation Strategy Sources

**16. S-Corp Election for Expats**

- IRC Section 1362, S corporation election
- Treasury Regulation 1.1362-6, elections and consents
- IRS Publication 589, Tax Information on S Corporations

### State Tax Domicile Sources

**17. State Domicile Law**

- Varies by state. Key sources: state revenue department publications, state court decisions on domicile, model definitions from uniform laws

### Professional Resources

**18. Continuing Education and Updates**

- IRS Continuing Professional Education: international tax topics, annual tax-law updates
- Professional tax organizations: National Association of Tax Professionals (NATP), American Society of Tax Problem Solvers (ASTPS), International Association of Tax Professionals

**19. Recommended Legal Databases (for Practitioners and Researchers)**

- RIA/Thomson Reuters: Federal Tax Coordinator, Tax Research NetWork
- CCH/Wolters Kluwer: Standard Federal Tax Reporter, Tax Research Library
- BNA/Bloomberg: Tax Management Portfolios, International Tax Planning guides

### Government Treaty and Agreement Sources

**20. Tax Treaties and Information Exchange**

- IRS Treaty Tables. Available at www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z
- Treasury Department treaty documents. Available at home.treasury.gov/policy-issues/tax-policy/treaties

### Quick Reference Links

**Essential IRS Resources:**

- Form 2555: www.irs.gov/forms-pubs/about-form-2555
- Publication 54: www.irs.gov/pub/irs-pdf/p54.pdf
- Form 4868: www.irs.gov/forms-pubs/about-form-4868
- IRS Data Book: www.irs.gov/statistics/soi-tax-stats-irs-data-book

**Professional Development:**

- AICPA International: www.aicpa.org
- IRS Continuing Education: www.irs.gov/tax-professionals/continuing-education
- Tax Treaties: www.irs.gov/businesses/international-businesses/united-states-income-tax-treaties-a-to-z

### Research Notes

**For current information:**

- All IRS forms and publications are updated annually
- Revenue procedures announce yearly exclusion amounts
- Case-law interpretation may evolve
- Professional guidance recommended for complex situations

**Citation best practices:**

- Include specific regulation sections
- Reference current-year forms and publications
- Cite relevant court cases for legal precedent
- Note amendment dates for regulations

Remember: tax law is complex and constantly evolving. These references provide a foundation, but professional advice is recommended for specific situations and current-law interpretation.

## Sources

Primary-source links verified against the cited authorities (opened and confirmed as of August 2026):

- IRC Section 911, Citizens or residents of the United States living abroad: [law.cornell.edu/uscode/text/26/911](https://www.law.cornell.edu/uscode/text/26/911)
- 26 CFR 1.911-2, Qualified individuals (physical presence and bona fide residence): [law.cornell.edu/cfr/text/26/1.911-2](https://www.law.cornell.edu/cfr/text/26/1.911-2)
- IRC Section 1402, Definitions (net earnings from self-employment): [law.cornell.edu/uscode/text/26/1402](https://www.law.cornell.edu/uscode/text/26/1402)
- IRC Section 1362, Election; revocation; termination (S corporation election): [law.cornell.edu/uscode/text/26/1362](https://www.law.cornell.edu/uscode/text/26/1362)
- IRM 4.60.1, Exchange of Information: [irs.gov/irm/part4/irm_04-060-001r](https://www.irs.gov/irm/part4/irm_04-060-001r)
- IRM 4.60.2, Mutual Agreement Procedures and Report Guidelines: [irs.gov/irm/part4/irm_04-060-002](https://www.irs.gov/irm/part4/irm_04-060-002)
- U.S.-Mexico income tax treaty documents (Income Tax Treaty 1992, Protocol 2003, and Technical Explanations): [irs.gov/businesses/international-businesses/mexico-tax-treaty-documents](https://www.irs.gov/businesses/international-businesses/mexico-tax-treaty-documents)
- U.S.-Mexico income tax treaty, full text (PDF): [irs.gov/pub/irs-trty/mexico.pdf](https://www.irs.gov/pub/irs-trty/mexico.pdf)
- IRS Form 2555, Foreign Earned Income: [irs.gov/forms-pubs/about-form-2555](https://www.irs.gov/forms-pubs/about-form-2555)
- IRS Publication 54, Tax Guide for U.S. Citizens and Resident Aliens Abroad: [irs.gov/pub/irs-pdf/p54.pdf](https://www.irs.gov/pub/irs-pdf/p54.pdf)

## To verify

- **IRM section titles.** This appendix cites IRM Section 4.60.1 as "International Examinations" and IRM 4.60.2 as "Foreign Earned Income Exclusion." The current published IRM titles are 4.60.1 "Exchange of Information" and 4.60.2 "Mutual Agreement Procedures and Report Guidelines." The IRM has been reorganized over time; confirm with counsel which current IRM section carries the international-examination and FEIE examination procedures the author intended to reference.
- **Treaty article numbering.** The U.S.-Mexico treaty PDF (irs.gov/pub/irs-trty/mexico.pdf) opens and is the genuine IRS treaty file, but its scanned text could not be machine-read to confirm the exact article numbering cited (Article 4 Residence, Article 7 Business Profits, Article 14 Independent Personal Services, Article 15 Dependent Personal Services). These match the standard 1992 treaty structure but were not verified line by line against the PDF. The treaty documents landing page (linked in Sources) confirms the 1992 Income Tax Treaty and 2003 Protocol exist.
- **IRS Notice for housing amounts.** Item 14 lists "IRS Notice 2024-XX," a placeholder in the source. Substitute the correct annual notice number for the relevant tax year before publication.
