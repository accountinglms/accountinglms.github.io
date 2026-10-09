// --- Data Definition ---
    const qChapter1_Part1 = [
        {
            q: "1. Which of the following best explains the term 'capital expenditure'?<br>Capital expenditure is expenditure:",
            type: "single",
            options: [
                "A. on property, plant and equipment, including repairs and maintenance",
                "B. on expensive items over £10,000",
                "C. on the acquisition of property, plant and equipment, or improvement in their earning capacity",
                "D. on items relating to owners' capital"
            ],
            answer: 2,
            expEng: "Capital expenditure relates to the acquisition of, or improvement of the earning capacity of, property, plant and equipment and other non-current assets.",
            expVie: "<strong>Chi phí vốn (Capital expenditure)</strong> liên quan đến việc mua sắm, hoặc cải thiện khả năng sinh lời của bất động sản, nhà xưởng và thiết bị (PPE) cùng các <strong>tài sản dài hạn (non-current assets)</strong> khác."
        },
        {            q: "2. Which of the following should be accounted for as capital expenditure?",
            type: "single",
            options: [
                "A. The annual cost of painting a factory floor",
                "B. The repair of a window in a building",
                "C. The purchase of a vehicle for re-sale by a car retailer",
                "D. Legal fees incurred on the purchase of a building"
            ],
            answer: 3,
            expEng: "Professional fees, such as legal fees, incurred on the acquisition of a non-current asset are capitalised as part of the cost of that asset. The other costs are revenue expenditure and are therefore written off as expenses in the year.",
            expVie: "Các khoản <strong>phí chuyên môn (Professional fees)</strong> phát sinh khi mua một tài sản dài hạn sẽ được <strong>vốn hóa (capitalised)</strong>. Các chi phí khác (A, B) là <strong>chi phí hoạt động (revenue expenditure)</strong>. Mua xe để bán lại (C) là hàng tồn kho."
        },
        {
            q: "3. Which of the following transactions should be treated as capital expenditure in the financial statements of Sydney, sole trader?",
            type: "single",
            options: [
                "A. £500 taken by Sydney to buy a music system for personal use",
                "B. £800 spent on purchasing a new laptop to replace the secretary's old one",
                "C. £2,000 on purchasing a machine for resale",
                "D. £150 paid to a painter for redecorating his office"
            ],
            answer: 1,
            expEng: "£800 spent on purchasing a new laptop. A is drawings. C is the acquisition of a current asset in the form of inventory. D is a revenue expense.",
            expVie: "£800 chi mua laptop mới là chi phí vốn vì là tài sản dùng lâu dài. A là khoản rút vốn (drawings). C là tài sản ngắn hạn (hàng tồn kho). D là chi phí hoạt động."
        },
        {
            q: "4. Which of the following is an aspect of relevance, according to the IFRS Foundation's <em>Conceptual Framework for Financial Reporting</em>?",
            type: "single",
            options: ["A. Neutrality", "B. Free from error", "C. Completeness", "D. Materiality"],
            answer: 3,
            expEng: "Information is affected by its materiality. A, B and C are all characteristics contributing to information being a faithful representation of what it claims to represent.",
            expVie: "Thông tin bị ảnh hưởng bởi <strong>tính trọng yếu (materiality)</strong> của nó (một khía cạnh của Tính thích hợp - Relevance). A, B, C thuộc về <strong>trình bày trung thực (faithful representation)</strong>."
        },
        {
            q: "5. According to the <em>Conceptual Framework for Financial Reporting</em>, which of the following are enhancing qualitative characteristics?",
            type: "single",
            options: [
                "A. Comparability, understandability, timeliness, verifiability",
                "B. Consistency, prudence, measurability, verifiability",
                "C. Consistency, reliability, measurability, timeliness",
                "D. Materiality, understandability, measurability, reliability"
            ],
            answer: 0,
            expEng: "This is set out in paragraph 2.23-2.36 of the Conceptual Framework for Financial Reporting.",
            expVie: "4 <strong>đặc điểm chất lượng gia tăng (enhancing qualitative characteristics)</strong>: <strong>Có thể so sánh (Comparability)</strong>, <strong>Dễ hiểu (understandability)</strong>, <strong>Kịp thời (timeliness)</strong>, và <strong>Có thể xác minh (verifiability)</strong>."
        },
        {
            q: "6. According to the <em>Conceptual Framework for Financial Reporting</em>, information on which <strong>two</strong> of the following areas can help users identify the reporting entity's financial strengths and weaknesses?<br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn đủ 2 đáp án)</span>",
            type: "multiple",
            required: 2,
            options: [
                "A. The economic resources it controls",
                "B. Its financial performance in the past",
                "C. The demographic structure of the local economy",
                "D. The claims on an entity's resource (the entity's liabilities)",
                "E. Its management structure"
            ],
            answer: [0, 3],
            expEng: "The Conceptual Framework states that information about the economic resources (A) and claims (D) of an entity can help users to identify the reporting entity's financial strengths and weaknesses.",
            expVie: "Thông tin về <strong>nguồn lực kinh tế (economic resources)</strong> và <strong>các khoản yêu cầu thanh toán (claims - Nợ phải trả/Vốn chủ)</strong> giúp xác định điểm mạnh/yếu tài chính."
        },
        {
            q: "7. According to IAS 1, <em>Presentation of Financial Statements</em> which <strong>two</strong> of the following are objectives of primary financial statements?<br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn đủ 2 đáp án)</span>",
            type: "multiple",
            required: 2,
            options: [
                "A. To show the results of management's stewardship of the resources entrusted to it",
                "B. To provide a basis for valuing the entity",
                "C. To provide information about the financial position, financial performance and cash flows of an entity that is useful to a wide range of users in making economic decisions",
                "D. To enable HM Revenue and Customs to calculate the entity's tax liability",
                "E. To assist management and those charged with governance in making timely economic decisions about deployment of the entity's resources"
            ],
            answer: [0, 2],
            expEng: "IAS 1 states the objective is to provide information about financial position, performance and cash flows (C) and show the results of management's stewardship (A).",
            expVie: "Mục tiêu là cung cấp thông tin về <strong>tình hình tài chính, hiệu quả hoạt động, lưu chuyển tiền tệ (C)</strong> và thể hiện kết quả về <strong>trách nhiệm quản lý (stewardship) (A)</strong>."
        },
        {
            q: "8. Information is relevant if it is capable of making a difference in the decisions made by users. According to the <em>Conceptual Framework</em>, financial information is capable of making a difference in decisions if it has which of the following?<br><br>(1) Predictive value<br>(2) Comparative value<br>(3) Historic value<br>(4) Confirmatory value",
            type: "single",
            options: ["A. 1 and 3 only", "B. 2 and 4 only", "C. 1 and 4 only", "D. 2 and 3 only"],
            answer: 2,
            expEng: "Financial information can make a difference to decisions if it has predictive value, confirmatory value or both.",
            expVie: "Thông tin có tính thích hợp nếu có <strong>giá trị dự đoán (predictive value)</strong> hoặc <strong>giá trị xác nhận (confirmatory value)</strong>, hoặc cả hai."
        },
        {
            q: "9. The accounting principle which, in times of rising prices, tends to understate asset values and overstate profits, is a:",
            type: "single",
            options: ["A. going concern", "B. accruals", "C. consistency", "D. historical cost"],
            answer: 3,
            expEng: "The historical cost convention determines cost of assets at the date of purchase. This results in higher profits because depreciation is lower.",
            expVie: "<strong>Nguyên tắc giá gốc (historical cost)</strong> ghi nhận theo chi phí lúc mua. Khi lạm phát, chi phí khấu hao thấp đi, khiến lợi nhuận bị <strong>đánh giá quá cao (overstate)</strong>."
        },
        {
            q: "10. Listed below are two comments on accounting conventions.<br>(1) According to the <em>Conceptual Framework</em>, financial information must be either relevant or faithfully represented if it is to be useful.<br>(2) Materiality means that only items having a physical existence may be recognised as assets.<br>Which, if either, of these comments is correct?",
            type: "single",
            options: ["A. 1 only", "B. 2 only", "C. Both of them", "D. Neither of them"],
            answer: 3,
            expEng: "(1) Information must be both relevant and faithfully represented. (2) Materiality concerns influence on decisions, not physical existence.",
            expVie: "(1) Sai vì phải đảm bảo <strong>CẢ HAI (both)</strong> tính thích hợp và trung thực. (2) Sai vì <strong>tính trọng yếu (Materiality)</strong> không phụ thuộc vào việc có hình thái vật chất hay không."
        },
        {
            q: "11. Which of the following is the best description of fair presentation in accordance with IAS 1, Presentation of Financial Statements?",
            type: "single",
            options: [
                "A. The financial statements are accurate.",
                "B. The financial statements are as accurate as possible given the accounting systems of the organisation.",
                "C. The directors of the company have stated that the financial statements are accurate and correctly prepared.",
                "D. The financial statements are reliable in that they faithfully reflect the effects of transactions, other events and conditions."
            ],
            answer: 3,
            expEng: "Consistent with the definition given in IAS 1, para. 15.",
            expVie: "<strong>Trình bày hợp lý (Fair presentation)</strong> đòi hỏi BCTC phải phản ánh trung thực (faithfully reflect) tác động của các giao dịch. Không có gì là chính xác tuyệt đối."
        },
        {
            q: "12. Which of the following definitions of the going concern concept in accounting is consistent with the definition given in IAS 1?",
            type: "single",
            options: [
                "A. The directors do not intend to liquidate the entity or to cease trading in the foreseeable future.",
                "B. The entity is able to pay its debts as and when they fall due.",
                "C. The directors expect the entity's assets to yield future economic benefits.",
                "D. Financial statements have been prepared on the assumption that the entity is solvent and would be able to pay all creditors in full in the event of being wound up."
            ],
            answer: 0,
            expEng: "Going concern relates to whether the entity will continue in operational existence without liquidating or ceasing trading.",
            expVie: "<strong>Giả định hoạt động liên tục (going concern)</strong> nghĩa là ban giám đốc <strong>không có ý định thanh lý (liquidate)</strong> hay ngừng kinh doanh (cease trading)."
        },
        {
            q: "13. According to IAS 1, compliance with IFRS Accounting Standards will normally ensure that:",
            type: "single",
            options: [
                "A. the entity's inventory is measured at net realisable value",
                "B. the entity's assets are measured at their break-up value",
                "C. the entity's financial statements are prepared on the assumption that it is not a going concern",
                "D. the entity's financial position, financial performance and cash flows are presented fairly"
            ],
            answer: 3,
            expEng: "This is consistent with IAS 1 para. 15.",
            expVie: "Tuân thủ IFRS sẽ đảm bảo BCTC được <strong>trình bày hợp lý (presented fairly)</strong>."
        },
        {
            q: "14. A sole trader purchased 45 bikes costing £650 each on credit in January. They sold 30 of these in February for £900 each. Paid supplier in March, collected cash in April. Which statement is true?",
            type: "single",
            options: [
                "A. Using the cash basis of accounting, at the end of April there will be inventory recorded of £9,750",
                "B. Using the cash basis of accounting, the loss for the month of March will be £19,500",
                "C. At the end of April, the sole trader will have £7,500 in the business bank account",
                "D. Using the accruals basis of accounting, the profit the month of February will be £7,500"
            ],
            answer: 3,
            expEng: "Using accruals basis, profit in Feb = (30 x £900) - (30 x £650) = £7,500.",
            expVie: "D đúng vì theo <strong>kế toán dồn tích (accruals basis)</strong>, doanh thu & chi phí ghi nhận khi phát sinh (tháng 2): Lợi nhuận = 30x900 - 30x650 = 7,500."
        },
        {
            q: "15. The directors of Lagon plc wish to omit an item from the company's financial statements on the grounds that it is commercially sensitive. Information on the item would influence the users of the information when making economic decisions. According to IAS 1, the item is said to be:",
            type: "single",
            options: ["A. neutral", "B. prudent", "C. material", "D. understandable"],
            answer: 2,
            expEng: "Items are material if omitting, misstating or obscuring them could influence the economic decisions of users.",
            expVie: "Được gọi là <strong>trọng yếu (material)</strong> vì việc bỏ sót (omit) có thể ảnh hưởng đến quyết định của người sử dụng."
        },
        {
            q: "16. Which of the following statements regarding the ISSB and IFRS Sustainability Disclosure Standards is true?",
            type: "single",
            options: [
                "A. The ISSB has authority to mandate the application of IFRS Sustainability Disclosure Standards",
                "B. The ISSB initially focused on climate-related disclosures",
                "C. The IFRS Sustainability Disclosure Standards will replace IFRS Accounting Standards",
                "D. Prior to the formation of the ISSB, there was no guidance available to entities relating to the disclosure of sustainability information"
            ],
            answer: 1,
            expEng: "The ISSB initially focused on climate-related disclosures due to the urgent need for information on climate-related matters.",
            expVie: "ISSB ban đầu <strong>tập trung vào công bố liên quan đến khí hậu (climate-related disclosures)</strong>. Các đáp án khác sai."
        },
        {
            q: "17. Which <strong>three</strong> of the following are fundamental principles of the IESBA Code of Ethics for Professional Accountants?<br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn đủ 3 đáp án)</span>",
            type: "multiple",
            required: 3,
            options: ["A. Integrity", "B. Objectivity", "C. Independence", "D. Confidentiality", "E. Courtesy"],
            answer: [0, 1, 3],
            expEng: "The fundamental principles include Integrity, Objectivity, and Confidentiality. Independence and Courtesy are NOT fundamental principles.",
            expVie: "5 Nguyên tắc cơ bản: <strong>Chính trực (Integrity)</strong>, <strong>Khách quan (Objectivity)</strong>, Năng lực & cẩn trọng, <strong>Bảo mật (Confidentiality)</strong>, và Tư cách nghề nghiệp."
        },
        {
            q: "18. Which of the following statements is correct?",
            type: "single",
            options: [
                "A. The ICAEW Code of Ethics applies to its members only.",
                "B. The ICAEW Code of Ethics applies to its members and employees of member firms only.",
                "C. The ICAEW Code of Ethics applies to its members, employees of member firms and ICAEW students.",
                "D. The ICAEW Code of Ethics applies to its members, employees of member firms, ICAEW students and all other members of UK accountancy bodies."
            ],
            answer: 2,
            expEng: "The ICAEW Code of Ethics applies to its members, employees of member firms and ICAEW students.",
            expVie: "Bộ quy tắc áp dụng cho hội viên (members), nhân viên của hãng thành viên (employees of member firms) và sinh viên ICAEW."
        },
        {
            q: "19. Which of the following statements best describes ethical guidance in the UK?",
            type: "single",
            options: [
                "A. Ethical guidance provides a set of rules which must be followed in all circumstances.",
                "B. Ethical guidance is a framework containing a combination of rules and principles, the application of which is dependent on the professional judgement of the accountant based on the specific circumstances.",
                "C. Ethical guidance provides a set of principles which can be applied at the discretion of the accountant.",
                "D. Ethical guidance is a series of legal requirements."
            ],
            answer: 1,
            expEng: "Ethical guidance is in the form of a framework (principles + some rules) relying on professional judgement.",
            expVie: "Là một <strong>Khuôn khổ (framework) kết hợp quy tắc và nguyên tắc</strong>, phụ thuộc vào <strong>đánh giá chuyên môn (professional judgement)</strong>."
        },
        {
            q: "20. Indicate whether each of the following statements are true or false.<br><span style='font-size:0.85em; color:#f57c00;'>(Tích vào ô trống nếu <strong>True</strong>)</span>",
            type: "tf",
            options: [
                "A code based upon a set of principles requires a professional accountant to comply with a set of specific rules.",
                "A rules-based code requires a professional accountant to identify, evaluate and address threats to compliance with fundamental ethical principles.",
                "The ICAEW uses a rules-based approach to professional ethics."
            ],
            answer: [false, false, false],
            expEng: "A code based on principles does not contain specific rules. A rules-based code does not require adhering to principles. ICAEW uses principles-based.",
            expVie: "Cả 3 đều Sai. ICAEW dùng <strong>phương pháp tiếp cận dựa trên nguyên tắc (principles-based approach)</strong>."
        },
        {
            q: "21. Which of the following is <strong>not</strong> a benefit to the primary users of annual reports of an entity providing sustainability-related financial disclosures?",
            type: "single",
            options: [
                "A. A better understanding of the entity's sustainability-related risks and its responses to those risks",
                "B. A better understanding of how the entity can create and maintain value",
                "C. Certainty that the company will meet its future sustainability-related disclosure targets because they have been disclosed",
                "D. The ability to make investment decisions based on an entity's social impacts as well as its financial performance"
            ],
            answer: 2,
            expEng: "There is no certainty that the sustainability-related targets will be met just because they are disclosed.",
            expVie: "Công bố thông tin không mang lại sự <strong>chắc chắn (certainty)</strong> rằng công ty sẽ hoàn thành mục tiêu."
        },
        {
            q: "22. Which <strong>two</strong> of the following are examples of dependencies which may affect an entity?<br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn đủ 2 đáp án)</span>",
            type: "multiple",
            required: 2,
            options: [
                "A. The level of greenhouse gas emissions generated by the entity",
                "B. The availability of natural resources used by the entity",
                "C. The health of the workforce of the entity",
                "D. The levels of waste generated by the entity"
            ],
            answer: [1, 2],
            expEng: "'Dependencies' refers to reliance on natural resources and relationships. Emissions and waste are 'impacts'.",
            expVie: "<strong>Sự phụ thuộc (Dependencies)</strong>: Tài nguyên (B) và Sức khỏe lao động (C). Còn khí thải (A) và chất thải (D) là <strong>Tác động (Impacts)</strong>."
        },
        {
            q: "23. Consider the following statements about sustainability.<br><span style='font-size:0.85em; color:#f57c00;'>(Tích vào ô trống nếu <strong>True</strong>)</span>",
            type: "tf",
            options: [
                "Factors that affect an entity's ability to create or maintain value are referred to as 'dependencies'.",
                "Information on dependencies is generally more useful to an entity's investors than information on impacts."
            ],
            answer: [true, true],
            expEng: "Information on dependencies gives insights into factors affecting entity's value, highly relevant to investors.",
            expVie: "Cả hai đều đúng. Thông tin về sự phụ thuộc vào chuỗi cung ứng, tài nguyên thì <strong>hữu ích hơn (more useful)</strong> cho nhà đầu tư so với thông tin về tác động môi trường."
        },
        {
            q: "24. The term 'sustainability' is understood to mean:",
            type: "single",
            options: [
                "A. Environmental and climate-change related issues only",
                "B. The ongoing ability of an entity to create a return for its investors",
                "C. The practice of meeting the needs of the present without compromising the ability of future generations to meet their own needs",
                "D. How a business positively or negatively affects environmental, societal, and governance issues"
            ],
            answer: 2,
            expEng: "Meeting the needs of the present without compromising the ability of future generations to meet their own needs.",
            expVie: "<strong>Tính bền vững (Sustainability)</strong> là đáp ứng nhu cầu hiện tại mà KHÔNG làm tổn hại đến các thế hệ tương lai (C)."
        },
        {
            q: "25. Which <strong>two</strong> of the following were consequences of historically having no mandatory standards relating to the disclosure of sustainability-related information:<br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn đủ 2 đáp án)</span>",
            type: "multiple",
            required: 2,
            options: [
                "A. A lack of guidance being available for entities on the disclosure of sustainability-related information",
                "B. Inconsistency in the nature and type of information disclosed",
                "C. A lack of understanding of how sustainability-related information linked to financial reporting",
                "D. Entities did not take any action relating to sustainability-related matters in their operations"
            ],
            answer: [1, 2],
            expEng: "Led to inconsistency (B) and a lack of understanding of linkages to financial reporting (C).",
            expVie: "Hậu quả: <strong>Thiếu nhất quán (inconsistency)</strong> trong báo cáo và thiếu hiểu biết về <strong>sự liên kết (linked)</strong> giữa báo cáo bền vững và báo cáo tài chính."
        },
        {
            q: "26. Which of the following statements regarding IFRS Sustainability Disclosure Standards is true?",
            type: "single",
            options: [
                "A. The IFRS Sustainability Disclosure Standards are a comprehensive set of standards covering all sustainability-related matters",
                "B. The IFRS Sustainability Disclosure Standards were developed without reference to existing sources of guidance",
                "C. The IFRS Sustainability Disclosure Standards are designed to complement existing IFRS Accounting Standards",
                "D. The IFRS Sustainability Disclosure Standards are intended to provide information to a wide range of stakeholders"
            ],
            answer: 2,
            expEng: "They are designed to complement existing IFRS Accounting Standards. They are not yet comprehensive and were built on existing guidance.",
            expVie: "Chuẩn mực Khai báo Bền vững IFRS được thiết kế để <strong>bổ sung (complement)</strong> cho các Chuẩn mực Kế toán IFRS hiện hành (C)."
        },
        {
            q: "27. According to IFRS S1, which of the following is <strong>not</strong> a heading under which companies must disclose their sustainability-related risks and opportunities?",
            type: "single",
            options: ["A. Governance", "B. Strategy", "C. Risk management", "D. Key performance indicators"],
            answer: 3,
            expEng: "The four headings are: governance, strategy, risk management, and metrics and targets. KPI is not one of them.",
            expVie: "4 cấu phần là: Quản trị, Chiến lược, Quản trị rủi ro, và Thước đo & Mục tiêu. <strong>KPI</strong> không nằm trong 4 tiêu đề này."
        },
        {
            q: "28. What are the two categories of climate-related risks identified in IFRS S2?",
            type: "single",
            options: [
                "A. Financial and operational",
                "B. Transition and physical",
                "C. Market and credit",
                "D. Legal and reputational"
            ],
            answer: 1,
            expEng: "IFRS S2 divides climate-related risks into transition risks and physical risks.",
            expVie: "2 nhóm rủi ro khí hậu: <strong>Rủi ro chuyển đổi (Transition risks)</strong> và <strong>Rủi ro vật lý (Physical risks)</strong>."
        }
    ];

    const qChapter1_Part2 = [
        {
            q: "Self-test Q1. Which of the following is classified as revenue expenditure?",
            type: "single",
            options: [
                "A. Purchase of inventories for resale",
                "B. Purchase of a motor vehicle to deliver goods to customers",
                "C. Purchase of machinery for use in production",
                "D. Purchase of a warehouse to store inventory"
            ],
            answer: 0,
            expEng: "The purchase of inventories for resale is revenue expenditure, as the inventories have been purchased for trade purposes.",
            expVie: "Mua hàng tồn kho để bán lại là <strong>chi phí hoạt động (revenue expenditure)</strong>. Các tài sản khác như xe cộ, máy móc, nhà kho đều là chi phí vốn (capital expenditure) vì sử dụng lâu dài."
        },
        {
            q: "Self-test Q2. Liability for the debts of the business does not fall on:",
            type: "single",
            options: [
                "A. A sole trader",
                "B. Partners in a general partnership",
                "C. A limited liability company",
                "D. Owners of a limited liability company"
            ],
            answer: 3,
            expEng: "Sole traders and partners bear full liability for debts. A limited liability company bears liability for its own debts. However, the liability of the owners (shareholders) is limited.",
            expVie: "Chủ sở hữu của công ty TNHH (shareholders) có trách nhiệm hữu hạn đối với vốn góp, <strong>không phải chịu trách nhiệm cá nhân (liability does not fall on)</strong> đối với các khoản nợ của công ty."
        },
        {
            q: "Self-test Q3. According to IAS 1, which of the following is <strong>not</strong> an objective of financial statements?",
            type: "single",
            options: [
                "A. To provide information to investors in making economic decisions",
                "B. To provide information to managers in making business decisions",
                "C. To show the results of management's stewardship of the resources entrusted to it",
                "D. To provide information about the cash flows of the entity"
            ],
            answer: 1,
            expEng: "IAS 1 identifies A, C and D as objectives of financial statements. The use of accounting information by managers in making business decisions is not identified as an objective (this is Management Accounting).",
            expVie: "Cung cấp thông tin cho nhà quản lý ra quyết định kinh doanh (B) là mục tiêu của kế toán quản trị, KHÔNG phải mục tiêu của <strong>Báo cáo tài chính (Financial Statements)</strong> theo IAS 1."
        },
        {
            q: "Self-test Q4. Which one of the following issues in an entity's financial statements is likely to be of most interest to an entity's lender?",
            type: "single",
            options: [
                "A. Whether the entity has paid a dividend",
                "B. Whether the entity will repay a loan when it falls due",
                "C. Whether the entity will continue to be able to employ people",
                "D. Whether the entity patronises local suppliers"
            ],
            answer: 1,
            expEng: "Lenders are most interested in whether the entity will repay a loan when it falls due (B). A is for investors, C is for employees, D is for suppliers.",
            expVie: "<strong>Người cho vay (lender)</strong> như ngân hàng sẽ quan tâm nhất đến việc công ty có khả năng <strong>trả nợ khi đến hạn (repay a loan when it falls due)</strong> hay không."
        },
        {
            q: "Self-test Q5. The IFRS Foundation formed the ISSB in 2021. What does the acronym ISSB stand for?",
            type: "single",
            options: [
                "A. International Social Standards Board",
                "B. International Sustainability Standards Board",
                "C. International Standards on Sustainability Benefits",
                "D. International Society on Sustainability Benefits"
            ],
            answer: 1,
            expEng: "The ISSB is the International Sustainability Standards Board. It will sit alongside the IASB and will issue IFRS Sustainability Disclosure Standards.",
            expVie: "ISSB là viết tắt của <strong>Ủy ban Chuẩn mực Khai báo Bền vững Quốc tế (International Sustainability Standards Board)</strong>."
        },
        {
            q: "Self-test Q6. A statement of financial position is best described as:",
            type: "single",
            options: [
                "A. A snapshot of the entity's financial position at a particular point in time",
                "B. A record of an entity's financial performance over a period of time",
                "C. A list of all the income and expenses of the entity at a particular point in time",
                "D. A list of all the assets and liabilities of the entity over a period of time"
            ],
            answer: 0,
            expEng: "A statement of financial position is a list of assets and liabilities which represent the entity's financial position at a particular point in time (A snapshot).",
            expVie: "Bảng cân đối kế toán (Tình hình tài chính) là một <strong>bức ảnh chụp nhanh (snapshot)</strong> về tài sản và nguồn vốn của doanh nghiệp tại <strong>một thời điểm cụ thể (a particular point in time)</strong>."
        },
        {
            q: "Self-test Q7. In applying fundamental accounting concepts, the preparers of financial information are also using:",
            type: "single",
            options: [
                "A. Legislation",
                "B. Accounting standards",
                "C. Judgement",
                "D. Financial reporting standards"
            ],
            answer: 2,
            expEng: "Many figures in financial statements are derived from the application of judgement in putting fundamental accounting concepts into practice.",
            expVie: "Việc áp dụng các khái niệm kế toán cơ bản vào thực tế đòi hỏi người lập BCTC phải đưa ra các <strong>xét đoán chuyên môn (judgement)</strong> (như ước tính khấu hao, dự phòng...)."
        },
        {
            q: "Self-test Q8. Match the characteristic to the fundamental ethical principle.<br><br><strong>Requirement 1:</strong> Members should be straightforward and honest in all professional and business relationships.<br>A. Integrity &nbsp;&nbsp;&nbsp; B. Objectivity<br><br><strong>Requirement 2:</strong> Members should not allow bias, conflict of interest or undue influence of others to override professional or business judgements.<br>C. Integrity &nbsp;&nbsp;&nbsp; D. Objectivity<br><br><span style='font-size:0.85em; color:#64b5f6;'>(Chọn 2 đáp án đúng nhất cho 2 yêu cầu trên)</span>",
            type: "multiple",
            required: 2,
            options: [
                "A (Integrity for Req 1)",
                "B (Objectivity for Req 1)",
                "C (Integrity for Req 2)",
                "D (Objectivity for Req 2)"
            ],
            answer: [0, 3],
            expEng: "Straightforward and honest relates to Integrity. Not allowing bias relates to Objectivity.",
            expVie: "Thẳng thắn và trung thực là <strong>Tính chính trực (Integrity)</strong>. Không để thành kiến hoặc xung đột lợi ích chi phối là <strong>Tính khách quan (Objectivity)</strong>."
        },
        {
            q: "Self-test Q9. Which of the following would <strong>not</strong> be a suitable question to ask yourself when resolving an ethical dilemma?",
            type: "single",
            options: [
                "A. Would my colleagues think my solution is reasonable?",
                "B. Have I thought about all the possible consequences of my solution?",
                "C. Could I defend my solution under public scrutiny?",
                "D. Does my solution benefit my career?"
            ],
            answer: 3,
            expEng: "The best solution to an ethical dilemma should be taken whether or not it improves your career.",
            expVie: "Khi giải quyết tình huống đạo đức, lợi ích cho sự nghiệp cá nhân (D) <strong>không phải (not suitable)</strong> là yếu tố được phép cân nhắc."
        },
        {
            q: "Self-test Q10. The ICAEW Code of Ethics only applies to the paid activities of the professional accountant.",
            type: "single",
            options: [
                "A. True",
                "B. False"
            ],
            answer: 1,
            expEng: "False. The Code of Ethics applies not only to the paid activities of the professional accountant but also to the life of the professional accountant (e.g. charity trustee).",
            expVie: "<strong>Sai (False)</strong>. Bộ quy tắc đạo đức áp dụng cho cả các hoạt động chuyên môn có hưởng lương và các hoạt động cá nhân của kế toán viên."
        },
        {
            q: "Self-test Q11. Which of the following is <strong>not</strong> a source of the accounting rules embodied in UK GAAP?",
            type: "single",
            options: [
                "A. The Companies Act 2006",
                "B. UK accounting standards",
                "C. Listing requirements of the London Stock Exchange",
                "D. Accounting requirements of an entity's US parent company"
            ],
            answer: 3,
            expEng: "UK GAAP refers to Generally Accepted Accounting Practice; the rules applied as a result of internal requirements (like US parent) cannot be part of GAAP.",
            expVie: "Yêu cầu kế toán nội bộ của công ty mẹ tại Mỹ (D) không phải là nguồn tạo nên <strong>UK GAAP (Các nguyên tắc kế toán được chấp nhận chung tại Anh)</strong>."
        },
        {
            q: "Self-test Q12. Materiality is an entity-specific aspect of which qualitative characteristic?",
            type: "single",
            options: [
                "A. Relevance",
                "B. Understandability",
                "C. Faithful representation",
                "D. Comparability"
            ],
            answer: 0,
            expEng: "The Conceptual Framework states that materiality is an entity-specific aspect of relevance.",
            expVie: "<strong>Tính trọng yếu (Materiality)</strong> là một khía cạnh cụ thể của <strong>Tính thích hợp (Relevance)</strong> tùy thuộc vào quy mô và bản chất của từng đơn vị (entity-specific)."
        },
        {
            q: "Self-test Q13. Which of the following is an item of capital expenditure?",
            type: "single",
            options: [
                "A. Cost of goods sold",
                "B. Purchase of a machine",
                "C. Repairs to a machine",
                "D. Wages cost"
            ],
            answer: 1,
            expEng: "Purchase of a machine results in the acquisition of a non-current asset. All the others are revenue expenditure.",
            expVie: "Mua máy móc (B) là <strong>chi phí vốn (capital expenditure)</strong> vì nó tạo ra tài sản dài hạn. Các mục còn lại (giá vốn, sửa chữa, tiền lương) là chi phí hoạt động (revenue expenditure)."
        },
        {
            q: "Self-test Q14. Which of the following best describes the term 'dependencies' in the context of IFRS S1?",
            type: "single",
            options: [
                "A. The reliance of the company on new technology",
                "B. The reliance of the company on the environment and on people and society",
                "C. The reliance of the company on external finance",
                "D. The reliance of the company on the legal and political environment"
            ],
            answer: 1,
            expEng: "Dependencies consider how the current and future environmental, social and governance issues can affect the organisation's ability to create and maintain value.",
            expVie: "<strong>Sự phụ thuộc (Dependencies)</strong> là việc công ty dựa vào <strong>môi trường, con người và xã hội</strong> để tạo ra và duy trì giá trị (ví dụ: cần nước sạch, cần lao động khỏe mạnh)."
        },
        {
            q: "Self-test Q15. IFRS S2 focuses specifically on which type of disclosures?",
            type: "single",
            options: [
                "A. Climate-related threats and benefits",
                "B. Climate-related risks and benefits",
                "C. Climate-related threats and opportunities",
                "D. Climate-related risks and opportunities"
            ],
            answer: 3,
            expEng: "IFRS S2 requires companies to identify and disclose material information about its climate-related risks and opportunities.",
            expVie: "IFRS S2 tập trung vào việc công bố các <strong>Rủi ro và Cơ hội liên quan đến khí hậu (Climate-related risks and opportunities)</strong>."
        }
    ];

    const qChapter1_Part3 = [
        {
            q: "1. Which of the following should be accounted for as capital expenditure?",
            type: "single",
            options: [
                "A. The cost of redecorating a business's head office",
                "B. The cost of replacing some roof tiles on a building",
                "C. The cost of a computer purchased for resale by a computer sales business",
                "D. The cost of delivery paid when purchasing a new manufacturing machine"
            ],
            answer: 3,
            expEng: "The delivery cost is part of the cost of getting the asset into working condition. A and B represent restoration to a previous level of condition, and C is the acquisition of an asset that would be classified as inventories.",
            expVie: "<strong>D đúng.</strong> Chi phí giao hàng để đưa máy móc mới vào trạng thái sẵn sàng hoạt động được tính vào <strong>chi phí vốn (capital expenditure)</strong>. A và B chỉ khôi phục tài sản về tình trạng trước đó nên là chi phí hoạt động; C là máy tính mua để bán lại nên được phân loại là <strong>hàng tồn kho (inventory)</strong>."
        },
        {
            q: "2. Which of the following items should be treated as a capital item in the financial statements of a business that operates from a large shop?<br><br>(1) Purchase of fixed shelving units<br>(2) Payment of wages<br>(3) Repairs to fixed shelving units",
            type: "single",
            options: [
                "A. (1) only",
                "B. (1) and (2) only",
                "C. (2) and (3) only",
                "D. (1), (2) and (3)"
            ],
            answer: 0,
            expEng: "Purchase of fixed shelving units is capital because the asset will be used to assist in the business process and lasts more than one year. Payment of wages is revenue because the benefits are consumed during the year or on a time basis. Repairs to fixed shelving units are revenue because repairs restore an asset to a previous level of performance.",
            expVie: "<strong>A đúng: chỉ (1).</strong> Kệ cố định được sử dụng cho hoạt động kinh doanh trong thời gian trên một năm nên là <strong>capital</strong>. Tiền lương là <strong>revenue expenditure</strong> vì lợi ích được tiêu dùng trong kỳ. Chi phí sửa chữa kệ cũng là <strong>revenue expenditure</strong> vì chỉ khôi phục tài sản về mức hoạt động trước đó."
        },
        {
            q: "3. Which of the following items should be treated as revenue items in an entity's financial statements?<br><br>(1) Annual servicing costs on motor vehicles<br>(2) Purchase of premises<br>(3) Installation of solar panels which will generate benefits over a ten-year period<br>(4) External audit fee",
            type: "single",
            options: [
                "A. (1) and (2) only",
                "B. (2) and (3) only",
                "C. (3) and (4) only",
                "D. (1) and (4) only"
            ],
            answer: 3,
            expEng: "Annual servicing costs on motor vehicles are revenue expenditure, the purchase of premises is capital expenditure, installation of solar panels is capital expenditure, and the external audit fee is revenue expenditure. Therefore, (1) and (4) are the revenue items.",
            expVie: "<strong>D đúng: (1) và (4).</strong> Chi phí bảo dưỡng xe hằng năm và phí kiểm toán bên ngoài là <strong>revenue expenditure</strong>. Mua bất động sản và lắp đặt tấm pin mặt trời tạo lợi ích trong nhiều năm là <strong>capital expenditure</strong>."
        },
        {
            q: "4. Which of the following should be classified as capital expenditure?",
            type: "single",
            options: [
                "A. Repairs to motor vans",
                "B. Depreciation of machinery",
                "C. Extension to premises",
                "D. Purchase of electric delivery vehicles for resale"
            ],
            answer: 2,
            expEng: "An extension to premises enhances the performance or capacity of the premises, so it is capital expenditure. A represents restoration of the asset, B is consumption of the asset over time, and D relates to inventory.",
            expVie: "<strong>C đúng.</strong> Việc mở rộng cơ sở làm tăng <strong>khả năng hoạt động/công suất</strong> của tài sản nên được ghi nhận là <strong>capital expenditure</strong>. A là sửa chữa để khôi phục tài sản, B là khấu hao phản ánh việc tiêu dùng tài sản theo thời gian, còn D là hàng mua để bán lại nên thuộc hàng tồn kho."
        },
        {
            q: "5. Which of the following is a consideration in the application of ICAEW's Code of Ethics?",
            type: "single",
            options: [
                "A. Whether or not the activity is remunerated",
                "B. If the specific matter is excluded from the guidance",
                "C. If an action brings discredit to the profession",
                "D. Whether or not the activity is an accounting or assurance engagement"
            ],
            answer: 2,
            expEng: "An aspect of professional behaviour is the avoidance of any action that discredits the profession.",
            expVie: "<strong>C đúng.</strong> Một yêu cầu của <strong>professional behaviour</strong> là tránh bất kỳ hành động nào có thể làm mất uy tín hoặc gây ảnh hưởng tiêu cực đến danh tiếng của nghề nghiệp."
        },
        {
            q: "6. Noah is considering two issues in the course of preparing their financial statements:<br><br><strong>Issue 1:</strong> Non-current assets are measured at cost less depreciation.<br><strong>Issue 2:</strong> Expenses incurred, but for which invoices have not yet been received, are included in the financial statements.<br><br>Which accounting characteristic or principle is relevant to each of these issues?",
            type: "single",
            options: [
                "A. Issue 1 – Verifiability; Issue 2 – Accruals",
                "B. Issue 1 – Accruals; Issue 2 – Verifiability",
                "C. Both issues: Verifiability",
                "D. Both issues: Accruals"
            ],
            answer: 3,
            expEng: "Both issues relate to accruals. For non-current assets, depreciation matches the cost to the periods over which the asset is used. Expenses that have been incurred are also recognised even when the related invoices have not yet been received.",
            expVie: "<strong>D đúng: cả hai đều là Accruals.</strong> Với tài sản dài hạn, khấu hao phân bổ chi phí của tài sản vào các kỳ mà tài sản được sử dụng. Với chi phí đã phát sinh nhưng chưa nhận hóa đơn, chi phí vẫn phải được ghi nhận trong kỳ phát sinh theo <strong>cơ sở dồn tích</strong>."
        },
        {
            q: "7. The auditor of Janse plc is insistent that great care is taken in estimating the amounts of prepayments.<br>Which accounting concept is primarily being applied?",
            type: "single",
            options: [
                "A. Going concern",
                "B. Maturity",
                "C. Consistency",
                "D. Accruals"
            ],
            answer: 3,
            expEng: "The accruals concept is also known as 'matching' – transactions are recognised in the period in which they occur.",
            expVie: "<strong>D đúng: Accruals.</strong> Cơ sở dồn tích cũng gắn với nguyên tắc <strong>matching</strong>: các giao dịch và khoản mục phải được ghi nhận vào đúng kỳ mà chúng phát sinh. Vì vậy việc ước tính prepayments cần được thực hiện cẩn thận để phân bổ đúng kỳ."
        },
        {
            q: "8. Brogan owns a business and often uses their own personal bank account to pay some business expenses. Brogan wishes to include all expenses shown in their personal bank account as business expenses, but their accountant has explained that only some of the amounts may be included.<br><br>Which of the following is the main reason why not all of Brogan's expenses can be included?",
            type: "single",
            options: [
                "A. Brogan has not recorded the full details of some of the expenditure and, because of this uncertainty, it is more prudent not to include them in the financial statements",
                "B. There are a large number of immaterial payments which would take a long time to examine",
                "C. The personal expenses of the owner are separate from those of the business and are not relevant to the financial statements",
                "D. To be consistent with last year's financial statements, only payments above £500 are included in the statement of profit or loss"
            ],
            answer: 2,
            expEng: "Only legitimate business expenses paid by the owner are relevant and will be included. Personal expenses of the owner are separate from those of the business.",
            expVie: "<strong>C đúng.</strong> Chỉ những <strong>chi phí kinh doanh hợp lệ</strong> do chủ doanh nghiệp thanh toán mới liên quan và được đưa vào báo cáo tài chính. Chi tiêu cá nhân của chủ sở hữu phải được tách biệt khỏi chi phí của doanh nghiệp."
        },
        {
            q: "9. Which of the following statements about the International Sustainability Standards Board (ISSB) is correct?",
            type: "single",
            options: [
                "A. The ISSB will issue mandatory laws that UK companies will be required to apply",
                "B. The ISSB will initially focus on climate-related disclosures",
                "C. The standards issued by the ISSB will replace those issued by the International Accounting Standards Board (IASB)",
                "D. The ISSB standards provide entities with the first guidance available in respect of sustainability disclosures"
            ],
            answer: 1,
            expEng: "The ISSB has stated that it will initially focus on climate-related disclosures due to the urgent need for information on climate-related matters.",
            expVie: "<strong>B đúng.</strong> ISSB cho biết trọng tâm ban đầu là các <strong>công bố liên quan đến khí hậu (climate-related disclosures)</strong> do nhu cầu cấp thiết về thông tin liên quan đến các vấn đề khí hậu."
        }
    ];

    // LMS hierarchy: Subject → Chapter → Exercise.
    // Add future subjects by appending another object to lmsData; the sidebar engine does not need to change.
    const lmsData = [
        {
            id: 'accounting_fundamental',
            title: 'Accounting Fundamental',
            chapters: [
                {
                    id: 'c1',
                    title: 'Chapter 1: Introduction to accounting',
                    sections: [
                        { id: 'c1_s1', title: '1. Practice Questions (1-28)', data: qChapter1_Part1 },
                        { id: 'c1_s2', title: '2. Self-test Questions (1-15)', data: qChapter1_Part2 },
                        { id: 'c1_s3', title: '3. User Question Bank (1-9)', data: qChapter1_Part3 }
                    ]
                },
                {
                    id: 'c2',
                    title: 'Chapter 2 (Sắp cập nhật...)',
                    sections: []
                }
            ]
        }
    ];

    // Flat compatibility index used by the existing quiz engine. Section IDs stay unchanged,
    // so progress from V5 and earlier versions continues to work.
    const courseData = lmsData.flatMap(subject =>
        subject.chapters.map(chapter => ({ ...chapter, subjectId: subject.id, subjectTitle: subject.title }))
    );

    // Snapshot the original bundled question bank once. It is used only as an offline/network fallback.
    const legacyFallbackByExercise = new Map();
    lmsData.forEach(subject => subject.chapters.forEach(chapter => chapter.sections.forEach(section => {
        legacyFallbackByExercise.set(section.id, section.data || []);
    })));

    function toLegacyQuestion(row) {
        return {
            questionId: row.id || null,
            q: row.prompt || '',
            type: row.question_type || 'single',
            options: Array.isArray(row.options) ? row.options : [],
            answer: row.correct_answer,
            required: Number(row.required_selections || (Array.isArray(row.correct_answer) ? row.correct_answer.length : 1)),
            expEng: row.explanation_en || '',
            expVie: row.explanation_vi || '',
            exampleEng: row.practical_example_en || '',
            exampleVie: row.practical_example_vi || '',
            standardReference: row.standard_reference || '',
            _legacyMigrated: row.metadata?.legacy_migrated === true
        };
    }

    function applyDatabaseCatalog({ subjects = [], chapters = [], exercises = [], questions = [] } = {}) {
        if (!Array.isArray(subjects) || subjects.length === 0) return false;

        const questionsByExercise = new Map();
        questions.forEach(row => {
            if (!questionsByExercise.has(row.exercise_id)) questionsByExercise.set(row.exercise_id, []);
            questionsByExercise.get(row.exercise_id).push(toLegacyQuestion(row));
        });

        const nextCatalog = subjects.map(subject => ({
            id: subject.id,
            title: subject.title,
            chapters: chapters
                .filter(chapter => chapter.subject_id === subject.id)
                .map(chapter => ({
                    id: chapter.id,
                    title: chapter.title,
                    sections: exercises
                        .filter(exercise => exercise.chapter_id === chapter.id)
                        .map(exercise => {
                            const legacy = legacyFallbackByExercise.get(exercise.id) || [];
                            const database = questionsByExercise.get(exercise.id) || [];
                            const data = exercise.content_mode === 'database'
                                ? database
                                : (legacy.length
                                    ? [...legacy, ...database.filter(question => !question._legacyMigrated)]
                                    : database);
                            return { id: exercise.id, title: exercise.title, data };
                        })
                }))
        }));

        const activeId = activeSectionId;
        const activeQuestion = currentQuestion;

        lmsData.splice(0, lmsData.length, ...nextCatalog);
        courseData.splice(
            0,
            courseData.length,
            ...nextCatalog.flatMap(subject =>
                subject.chapters.map(chapter => ({ ...chapter, subjectId: subject.id, subjectTitle: subject.title }))
            )
        );

        initSidebar();
        openRequestedExercise();

        if (activeId) {
            let found = null;
            courseData.some(chapter => {
                found = chapter.sections.find(section => section.id === activeId) || null;
                return Boolean(found);
            });
            if (found) {
                activeSectionData = found.data;
                activeSectionId = found.id;
                currentQuestion = Math.min(activeQuestion, Math.max(found.data.length - 1, 0));
            } else {
                activeSectionData = null;
                activeSectionId = null;
                currentQuestion = 0;
            }
        }

        updateAllSidebarScores();
        updateResumeButton();
        return true;
    }


    // App State — V3 Quiz Engine
    let activeSectionData = null;
    let activeSectionId = null;
    let currentQuestion = 0;
    let progressStore = {};
    let navFilter = 'all';
    let selectedOptions = new Set();
    let tfDraft = [];
    let exerciseDeepLinkHandled = false;

    // Never read another account's browser progress. Pre-v40 global keys remain untouched
    // as recoverable legacy archives; cloud remains the canonical cross-device source.
    const scopedKey = (base, userId) => base + ':user:' + (userId || 'signed-out');
    function bootUserId() {
        try { return JSON.parse(localStorage.getItem('icaew-lms-auth-v2') || 'null')?.user?.id || null; }
        catch { return null; }
    }
    let offlineUserId = bootUserId();
    let STORAGE_KEY = scopedKey('accountingLMSProgress_v2', offlineUserId);
    let UI_PREF_KEY = scopedKey('accountingLMSUiPrefs_v3', offlineUserId);
    const ATTEMPT_HISTORY_LAUNCHED_AT = Date.parse('2026-10-09T00:00:00Z');
    const MAX_ATTEMPT_DURATION_SECONDS = 24 * 60 * 60;

    function makeAttemptRunId() {
        if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
            const r = Math.random() * 16 | 0;
            const v = ch === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function createEmptySectionState(length) {
        return {
            answersStatus: new Array(length).fill(null),
            isAnswered: new Array(length).fill(false),
            bookmarks: new Array(length).fill(false),
            userSelections: new Array(length).fill(null),
            draftSelections: new Array(length).fill(null),
            score: 0,
            lastQuestion: 0,
            runId: null,
            startedAt: null,
            attemptRecorded: false,
            attemptRecording: false
        };
    }

    function validAttemptStartedAt(value, now = Date.now()) {
        const timestamp = Number(value);
        return Number.isFinite(timestamp)
            && timestamp >= ATTEMPT_HISTORY_LAUNCHED_AT
            && timestamp <= now + 5 * 60 * 1000;
    }

    function ensureAttemptRun(state) {
        if (!state) return;
        if (!state.runId) state.runId = makeAttemptRunId();
        if (!validAttemptStartedAt(state.startedAt)) state.startedAt = Date.now();
    }

    function attemptDurationSeconds(startedAt, finishedAt) {
        if (!validAttemptStartedAt(startedAt, finishedAt)) return null;
        const seconds = Math.max(0, Math.round((finishedAt - Number(startedAt)) / 1000));
        return seconds <= MAX_ATTEMPT_DURATION_SECONDS ? seconds : null;
    }

    function loadJSON(key, fallback = {}) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : fallback;
        } catch (err) {
            console.warn(`Không thể đọc ${key}:`, err);
            return fallback;
        }
    }

    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.warn(`Không thể lưu ${key}:`, err);
            return false;
        }
    }

    let savedProgress = loadJSON(STORAGE_KEY, {});
    const uiPrefs = { explanationLang: 'both', ...loadJSON(UI_PREF_KEY, {}) };
    window.lmsBindOfflineUser = function (userId) {
        const next = typeof userId === 'string' && /^[a-f0-9-]{36}$/i.test(userId) ? userId : null;
        if (next === offlineUserId) return;
        offlineUserId = next;
        STORAGE_KEY = scopedKey('accountingLMSProgress_v2', next);
        UI_PREF_KEY = scopedKey('accountingLMSUiPrefs_v3', next);
        savedProgress = loadJSON(STORAGE_KEY, {});
        Object.keys(uiPrefs).forEach(key => delete uiPrefs[key]);
        Object.assign(uiPrefs,{ explanationLang:'both', lastSectionId:null, updatedAt:0 },loadJSON(UI_PREF_KEY, {}));
        progressStore = {};
        activeSectionId = null;
        activeSectionData = null;
        currentQuestion = 0;
        if (typeof quizContainer !== 'undefined') quizContainer.style.display = 'none';
        if (typeof navGridContainer !== 'undefined') navGridContainer.style.display = 'none';
        if (typeof emptyState !== 'undefined') emptyState.style.display = '';
        initSidebar();
        updateAllSidebarScores();
        updateResumeButton();
    };
    // Explicit, single-account recovery for legacy browser-only progress.
    // Do not silently attach the old global archive to a different user's cloud account.
    window.lmsRecoverLegacyProgress = function() {
        if (!offlineUserId) throw new Error('Cần đăng nhập trước khi khôi phục.');
        const legacy = loadJSON('accountingLMSProgress_v2', {});
        if (!legacy || typeof legacy !== 'object') return 0;
        let imported = 0;
        for (const chapter of courseData) {
            for (const section of chapter.sections) {
                const archived = legacy[section.id];
                if (!archived || typeof archived !== 'object') continue;
                const next = normalizeSectionState(archived, section.data.length);
                const existing = normalizeSectionState(progressStore[section.id], section.data.length);
                if ((Number(existing.updatedAt) || 0) >= (Number(next.updatedAt) || 0)) continue;
                if (!next.isAnswered.some(Boolean) && !next.bookmarks.some(Boolean)
                        && !next.draftSelections.some(v => v != null)) continue;
                progressStore[section.id] = next;
                savedProgress[section.id] = next;
                imported++;
            }
        }
        if (imported) {
            saveProgress();
            initSidebar();
            updateAllSidebarScores();
            updateResumeButton();
        }
        return imported;
    };
    const THEME_KEY = 'icaewLMSTheme_v1';

    function getCurrentTheme() {
        return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    }

    function syncThemeChrome(theme) {
        const isDark = theme === 'dark';
        const desktopToggle = document.getElementById('theme-toggle');
        const mobileToggle = document.getElementById('mobile-theme-toggle');
        const themeMeta = document.getElementById('theme-color-meta');
        const statusMeta = document.getElementById('apple-status-bar-meta');
        if (desktopToggle) {
            desktopToggle.setAttribute('aria-checked', String(isDark));
            desktopToggle.setAttribute('aria-label', isDark ? 'Đang dùng giao diện tối. Chuyển sang sáng' : 'Đang dùng giao diện sáng. Chuyển sang tối');
            desktopToggle.title = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
        }
        if (mobileToggle) {
            mobileToggle.textContent = isDark ? '☀︎' : '☾';
            mobileToggle.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
            mobileToggle.title = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
        }
        if (themeMeta) themeMeta.setAttribute('content', isDark ? '#121212' : '#f4f7fb');
        if (statusMeta) statusMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }

    function applyTheme(theme, persist = true) {
        const next = theme === 'light' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        if (persist) {
            try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
        }
        syncThemeChrome(next);
    }

    function toggleTheme() {
        applyTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
    }

    function saveProgress() {
        const ok = saveJSON(STORAGE_KEY, progressStore);
        const el = document.getElementById('save-status');
        if (el) {
            if (ok) {
                const now = new Date();
                el.textContent = `Đã lưu ${now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                el.style.color = '#6fbf73';
            } else {
                el.textContent = 'Không thể lưu tiến độ';
                el.style.color = '#ef5350';
            }
        }
    }

    function saveUIPrefs() { saveJSON(UI_PREF_KEY, uiPrefs); }

    function normalizeSectionState(saved, length) {
        const empty = createEmptySectionState(length);
        if (!saved || typeof saved !== 'object') return empty;
        const normalized = { ...empty, ...saved };
        ['answersStatus','isAnswered','bookmarks','userSelections','draftSelections'].forEach(key => {
            const source = Array.isArray(saved[key]) ? saved[key].slice(0, length) : empty[key].slice();
            while (source.length < length) source.push(key === 'isAnswered' || key === 'bookmarks' ? false : null);
            normalized[key] = source;
        });
        normalized.lastQuestion = Math.min(Math.max(Number(saved.lastQuestion) || 0, 0), Math.max(length - 1, 0));
        normalized.score = normalized.answersStatus.filter(x => x === 'correct').length;
        normalized.runId = typeof saved.runId === 'string' && saved.runId ? saved.runId : null;
        normalized.startedAt = validAttemptStartedAt(saved.startedAt) ? Number(saved.startedAt) : null;
        normalized.attemptRecorded = saved.attemptRecorded === true;
        normalized.attemptRecording = false;
        return normalized;
    }

    // DOM Elements
    const mainArea = document.getElementById('main-area');
    const emptyState = document.getElementById('empty-state');
    const quizContainer = document.getElementById('quiz-container');
    const navGridContainer = document.getElementById('nav-grid-container');
    const sectionTitleDisplay = document.getElementById('section-title-display');
    const sidebarChapters = document.getElementById('sidebar-chapters');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileSectionTitle = document.getElementById('mobile-section-title');
    const mobileQuestionProgress = document.getElementById('mobile-question-progress');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const navToggleBtn = document.getElementById('nav-toggle-btn');
    const resumeLastBtn = document.getElementById('resume-last-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle');

    themeToggleBtn?.addEventListener('click', toggleTheme);
    mobileThemeToggleBtn?.addEventListener('click', toggleTheme);
    syncThemeChrome(getCurrentTheme());

    if (window.matchMedia) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
        systemTheme.addEventListener?.('change', e => {
            let hasExplicitTheme = false;
            try { hasExplicitTheme = ['light','dark'].includes(localStorage.getItem(THEME_KEY)); } catch (_) {}
            if (!hasExplicitTheme) applyTheme(e.matches ? 'dark' : 'light', false);
        });
    }

    const questionText = document.getElementById('question-text');
    const questionHelper = document.getElementById('question-helper');
    const validationMsg = document.getElementById('validation-msg');
    const optionsContainer = document.getElementById('options-container');
    const explanationBox = document.getElementById('explanation');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const progressText = document.getElementById('progress');
    const quizBody = document.getElementById('quiz-body');
    const scoreBoard = document.getElementById('score-board');
    const navBar = document.getElementById('nav-bar');
    const bookmarkBtn = document.getElementById('bookmark-btn');
    const progressFill = document.getElementById('progress-fill');
    const statAnswered = document.getElementById('stat-answered');
    const statCorrect = document.getElementById('stat-correct');
    const statWrong = document.getElementById('stat-wrong');
    const statBookmarked = document.getElementById('stat-bookmarked');

    // Mobile sidebar / app-shell
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
        document.body.classList.add('sidebar-open');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
    }
    mobileMenuBtn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    sidebarOverlay.addEventListener('click', closeSidebar);
    sidebarCloseBtn?.addEventListener('click', closeSidebar);

    let sidebarTouchStartX = null;
    sidebar.addEventListener('touchstart', e => { sidebarTouchStartX = e.changedTouches?.[0]?.clientX ?? null; }, {passive:true});
    sidebar.addEventListener('touchend', e => {
        if (sidebarTouchStartX == null) return;
        const endX = e.changedTouches?.[0]?.clientX ?? sidebarTouchStartX;
        if (endX - sidebarTouchStartX < -70) closeSidebar();
        sidebarTouchStartX = null;
    }, {passive:true});

    function setMobileNavigatorCollapsed(collapsed) {
        navGridContainer.classList.toggle('mobile-collapsed', collapsed);
        if (navToggleBtn) {
            navToggleBtn.setAttribute('aria-expanded', String(!collapsed));
            navToggleBtn.textContent = collapsed ? 'Mở bảng câu' : 'Thu gọn';
        }
    }
    navToggleBtn?.addEventListener('click', () => setMobileNavigatorCollapsed(!navGridContainer.classList.contains('mobile-collapsed')));

    const mobileMedia = window.matchMedia('(max-width: 900px)');
    function syncResponsiveShell() {
        if (!mobileMedia.matches) { closeSidebar(); setMobileNavigatorCollapsed(false); }
        else if (!navGridContainer.dataset.mobileTouched) setMobileNavigatorCollapsed(true);
    }
    navToggleBtn?.addEventListener('click', () => { navGridContainer.dataset.mobileTouched = '1'; });
    mobileMedia.addEventListener?.('change', syncResponsiveShell);

    const attemptSummaryByExercise = new Map();

    window.lmsSetAttemptSummaries = rows => {
        attemptSummaryByExercise.clear();
        const ordered = Array.isArray(rows) ? rows.slice().sort(
            (a,b) => Date.parse(b.completed_at || 0) - Date.parse(a.completed_at || 0)
        ) : [];
        ordered.forEach(row => {
            const id = row?.exercise_id;
            if (!id) return;
            let summary = attemptSummaryByExercise.get(id);
            const pct = Number(row.total_questions) > 0 ? Number(row.score || 0) / Number(row.total_questions) : 0;
            if (!summary) {
                summary = { latest: row, best: row, count: 0 };
                attemptSummaryByExercise.set(id, summary);
            }
            summary.count += 1;
            const bestPct = Number(summary.best?.total_questions) > 0
                ? Number(summary.best.score || 0) / Number(summary.best.total_questions)
                : -1;
            if (pct > bestPct) summary.best = row;
        });
        updateAllSidebarScores();
    };

    window.addEventListener('lms:attempt-summary-updated', event => {
        const row = event.detail;
        if (!row?.exercise_id) return;
        const current = [];
        attemptSummaryByExercise.forEach(summary => {
            if (summary?.latest) current.push(summary.latest);
            if (summary?.best && summary.best.id !== summary.latest?.id) current.push(summary.best);
        });
        current.push(row);
        window.lmsSetAttemptSummaries(current);
    });

    // Sidebar — three-level hierarchy: Subject → Chapter → Exercise
    function initSidebar() {
        sidebarChapters.innerHTML = '';
        let chapterOrdinal = 0;

        lmsData.forEach((subject, subjectIndex) => {
            const subjectDiv = document.createElement('div');
            subjectDiv.className = 'subject';
            subjectDiv.id = `subject-${subject.id}`;
            if (subjectIndex !== 0) subjectDiv.classList.add('collapsed');

            const subjectHeader = document.createElement('div');
            subjectHeader.className = 'subject-header';
            subjectHeader.tabIndex = 0;
            subjectHeader.setAttribute('role', 'button');
            subjectHeader.setAttribute('aria-expanded', String(subjectIndex === 0));
            subjectHeader.innerHTML = `<span class="subject-title"></span><span class="subject-meta">${subject.chapters.length} chương</span>`;
            subjectHeader.querySelector('.subject-title').textContent = subject.title;
            const toggleSubject = () => {
                subjectDiv.classList.toggle('collapsed');
                subjectHeader.setAttribute('aria-expanded', String(!subjectDiv.classList.contains('collapsed')));
            };
            subjectHeader.onclick = toggleSubject;
            subjectHeader.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSubject(); } };
            subjectDiv.appendChild(subjectHeader);

            const subjectContent = document.createElement('div');
            subjectContent.className = 'subject-content';

            subject.chapters.forEach(chapter => {
                const chapDiv = document.createElement('div');
                chapDiv.className = 'chapter';
                chapDiv.dataset.chapterId = chapter.id;
                if (chapterOrdinal !== 0) chapDiv.classList.add('collapsed');

                const chapHeader = document.createElement('div');
                chapHeader.className = 'chapter-header';
                chapHeader.innerText = chapter.title;
                chapHeader.tabIndex = 0;
                chapHeader.setAttribute('role', 'button');
                chapHeader.setAttribute('aria-expanded', String(chapterOrdinal === 0));
                const toggleChapter = () => {
                    chapDiv.classList.toggle('collapsed');
                    chapHeader.setAttribute('aria-expanded', String(!chapDiv.classList.contains('collapsed')));
                };
                chapHeader.onclick = toggleChapter;
                chapHeader.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChapter(); } };
                chapDiv.appendChild(chapHeader);

                const chapContent = document.createElement('div');
                chapContent.className = 'chapter-content';

                chapter.sections.forEach(sec => {
                    progressStore[sec.id] = normalizeSectionState(progressStore[sec.id] || savedProgress[sec.id], sec.data.length);

                    const secItem = document.createElement('div');
                    secItem.className = 'section-item';
                    secItem.id = `menu-${sec.id}`;
                    secItem.dataset.subjectId = subject.id;
                    secItem.dataset.chapterId = chapter.id;
                    secItem.tabIndex = 0;
                    secItem.setAttribute('role', 'button');
                    secItem.innerHTML = `<span class="section-label"></span><span class="section-score-badge" aria-label="Điểm"></span>`;
                    secItem.querySelector('.section-label').textContent = sec.title;
                    const openSection = () => { loadSection(sec.id, sec.title, sec.data); closeSidebar(); };
                    secItem.onclick = openSection;
                    secItem.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSection(); } };
                    chapContent.appendChild(secItem);
                    updateSidebarScore(sec.id, sec.data.length);
                });

                if (chapter.sections.length === 0) {
                    const emptyItem = document.createElement('div');
                    emptyItem.className = 'section-item section-empty';
                    emptyItem.style.pointerEvents = 'none';
                    emptyItem.innerText = '(Chưa có dữ liệu)';
                    chapContent.appendChild(emptyItem);
                }

                chapDiv.appendChild(chapContent);
                subjectContent.appendChild(chapDiv);
                chapterOrdinal++;
            });

            subjectDiv.appendChild(subjectContent);
            sidebarChapters.appendChild(subjectDiv);
        });
        saveProgress();
        syncResponsiveShell();
    }

    function updateSidebarScore(secId, total) {
        const item = document.getElementById(`menu-${secId}`);
        const state = progressStore[secId];
        if (!item || !state || !total) return;
        const answered = state.isAnswered.filter(Boolean).length;
        const correct = state.answersStatus.filter(x => x === 'correct').length;
        const currentCompleted = answered === total;
        const summary = attemptSummaryByExercise.get(secId);
        const latest = summary?.latest || null;
        const displayScore = currentCompleted
            ? { score: correct, total_questions: total }
            : latest;
        const badge = item.querySelector('.section-score-badge');
        const hasResult = Boolean(displayScore && Number(displayScore.total_questions) > 0);
        const displayPct = hasResult ? Number(displayScore.score || 0) / Number(displayScore.total_questions) : 0;

        item.classList.toggle('completed', hasResult);
        item.classList.toggle('historical-score', !currentCompleted && Boolean(latest));
        item.classList.toggle('perfect', hasResult && displayPct === 1);
        item.classList.toggle('low-score', hasResult && displayPct < 0.7);

        if (badge) {
            badge.textContent = hasResult ? `${displayScore.score}/${displayScore.total_questions}` : '';
            if (summary?.latest) {
                const best = summary.best || summary.latest;
                badge.title = `Gần nhất: ${summary.latest.score}/${summary.latest.total_questions} · Tốt nhất: ${best.score}/${best.total_questions} · ${summary.count} lượt`;
            } else {
                badge.title = currentCompleted ? `Điểm: ${correct}/${total} (${Math.round(correct / total * 100)}%)` : '';
            }
        }
        const label = item.querySelector('.section-label')?.textContent || '';
        item.setAttribute('aria-label', hasResult ? `${label}. Điểm gần nhất ${displayScore.score} trên ${displayScore.total_questions}.` : label);
    }

    function updateAllSidebarScores() {
        courseData.forEach(chapter => chapter.sections.forEach(sec => updateSidebarScore(sec.id, sec.data.length)));
    }

    function localSectionLength(secId) {
        for (const chapter of courseData) {
            const section = (chapter.sections || []).find(item => item.id === secId);
            if (section) return section.data.length;
        }
        return 0;
    }

    function updateMobileHeader(mode = 'question') {
        if (!mobileSectionTitle || !mobileQuestionProgress) return;
        if (!activeSectionData || !activeSectionId) {
            mobileSectionTitle.textContent = 'ICAEW LMS';
            mobileQuestionProgress.textContent = 'Chọn bài tập để bắt đầu';
            return;
        }        const activeMenuLabel = document.querySelector(`#menu-${activeSectionId} .section-label`)?.textContent || sectionTitleDisplay.textContent || 'Bài tập';
        mobileSectionTitle.textContent = activeMenuLabel;
        mobileQuestionProgress.textContent = mode === 'results' ? 'Kết quả bài làm' : `Câu ${currentQuestion + 1}/${activeSectionData.length}`;
    }

    function findSectionById(secId) {
        for (const chapter of courseData) {
            const section = chapter.sections.find(sec => sec.id === secId);
            if (section) return section;
        }
        return null;
    }

    function openRequestedExercise() {
        if (exerciseDeepLinkHandled) return false;
        const requested = new URLSearchParams(location.search).get('exercise');
        if (!requested) {
            exerciseDeepLinkHandled = true;
            return false;
        }
        const section = findSectionById(requested);
        if (!section || !section.data?.length) return false;
        exerciseDeepLinkHandled = true;
        loadSection(section.id, section.title, section.data);
        return true;
    }

    function updateResumeButton() {
        const picker = document.getElementById('learner-start-options');
        if (picker) {
            picker.replaceChildren();
            let count = 0;
            for (const chapter of courseData) {
                for (const section of chapter.sections || []) {
                    if (!section.data?.length || count >= 4) continue;
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'learner-start-option';
                    const title = document.createElement('strong');
                    title.textContent = section.title;
                    const sub = document.createElement('span');
                    sub.textContent = chapter.title + ' · ' + section.data.length + ' câu';
                    button.append(title, sub);
                    button.addEventListener('click', () => loadSection(section.id, section.title, section.data));
                    picker.appendChild(button);
                    count++;
                }
            }
            if (!count) {
                const text = document.createElement('p');
                text.className = 'learner-start-footnote';
                text.textContent = 'Chưa có bài tập. Hãy vào Thư viện để xem tài liệu hiện có.';
                picker.appendChild(text);
            }
        }
        if (!resumeLastBtn) return;
        const section = findSectionById(uiPrefs.lastSectionId);
        if (!section) {
            resumeLastBtn.style.display = 'none';
            return;
        }
        resumeLastBtn.style.display = 'inline-flex';
        resumeLastBtn.style.alignItems = 'center';
        resumeLastBtn.style.justifyContent = 'center';
        resumeLastBtn.textContent = `Tiếp tục: ${section.title}`;
        resumeLastBtn.onclick = () => loadSection(section.id, section.title, section.data);
    }

    function loadSection(secId, secTitle, dataArray) {
        document.querySelectorAll('.section-item').forEach(el => { el.classList.remove('active'); el.removeAttribute('aria-current'); });
        const activeMenuItem = document.getElementById(`menu-${secId}`);
        activeMenuItem?.classList.add('active');
        activeMenuItem?.setAttribute('aria-current', 'page');
        const parentSubject = activeMenuItem?.closest('.subject');
        const parentChapter = activeMenuItem?.closest('.chapter');
        if (parentSubject?.classList.contains('collapsed')) {
            parentSubject.classList.remove('collapsed');
            parentSubject.querySelector(':scope > .subject-header')?.setAttribute('aria-expanded', 'true');
        }
        if (parentChapter?.classList.contains('collapsed')) {
            parentChapter.classList.remove('collapsed');
            parentChapter.querySelector(':scope > .chapter-header')?.setAttribute('aria-expanded', 'true');
        }
        uiPrefs.lastSectionId = secId;
        saveUIPrefs();
        emptyState.style.display = 'none';
        quizContainer.style.display = 'block';
        navGridContainer.style.display = 'block';
        quizBody.style.display = 'block';
        scoreBoard.style.display = 'none';
        sectionTitleDisplay.innerText = secTitle;
        activeSectionId = secId;
        activeSectionData = dataArray;
        ensureAttemptRun(progressStore[secId]);
        saveProgress();
        currentQuestion = progressStore[secId]?.lastQuestion || 0;
        navFilter = 'all';
        updateFilterButtons();
        initNavGrid();
        if (mobileMedia.matches) { navGridContainer.dataset.mobileTouched = ''; setMobileNavigatorCollapsed(true); }
        updateMobileHeader('question');
        loadQuestion();
    }

    function initNavGrid() {
        navBar.innerHTML = '';
        activeSectionData.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nav-btn';
            btn.id = `nav-btn-${i}`;
            btn.innerHTML = (i + 1) + `<span class="bookmark-indicator">★</span>`;
            btn.setAttribute('aria-label', `Đi tới câu ${i + 1}`);
            btn.onclick = () => jumpToQuestion(i);
            navBar.appendChild(btn);
        });
        updateNavUI();
    }

    function draftComplete(index) {
        if (!activeSectionData || !activeSectionId) return false;
        const state = progressStore[activeSectionId];
        const question = activeSectionData[index];
        if (!state || !question) return false;
        if (state.isAnswered[index]) return true;

        const draft = state.draftSelections[index];
        if (question.type === 'single') return Number.isInteger(draft);
        if (question.type === 'multiple') {
            const required = Number(question.required || (Array.isArray(question.answer) ? question.answer.length : 0));
            return Array.isArray(draft)
                && draft.length === required
                && draft.every(value => Number.isInteger(value));
        }
        return Array.isArray(draft)
            && draft.length === question.options.length
            && draft.every(value => typeof value === 'boolean');
    }

    function answeredCount() {
        if (!activeSectionData || !activeSectionId) return 0;
        const state = progressStore[activeSectionId];
        if (!state) return 0;
        return activeSectionData.reduce(
            (total, _, index) => total + (state.isAnswered[index] || draftComplete(index) ? 1 : 0),
            0
        );
    }

    function firstIncomplete() {
        if (!activeSectionData || !activeSectionId) return -1;
        const state = progressStore[activeSectionId];
        return activeSectionData.findIndex(
            (_, index) => !state.isAnswered[index] && !draftComplete(index)
        );
    }

    function updateHelper() {
        if (!questionHelper || !activeSectionData || !activeSectionId) return;
        const state = progressStore[activeSectionId];
        if (state.isAnswered[currentQuestion]) return;
        questionHelper.textContent = draftComplete(currentQuestion)
            ? '✓ Đáp án đã được lưu. Có thể chuyển câu; “Kiểm tra đáp án” chỉ dùng khi muốn xem đúng/sai ngay.'
            : 'Chọn đáp án rồi chuyển câu. Hệ thống sẽ tự lưu; không cần kiểm tra từng câu.';
    }

    function updateStats() {
        if (!activeSectionId || !activeSectionData) return;
        const state = progressStore[activeSectionId];
        const answered = answeredCount();
        const correct = state.answersStatus.filter(x => x === 'correct').length;
        const wrong = state.answersStatus.filter(x => x === 'wrong').length;
        const bookmarks = state.bookmarks.filter(Boolean).length;
        const total = activeSectionData.length;
        statAnswered.textContent = `${answered}/${total}`;
        statCorrect.textContent = correct;
        statWrong.textContent = wrong;
        statBookmarked.textContent = bookmarks;
        progressFill.style.width = total ? `${(answered / total) * 100}%` : '0%';
        progressFill.parentElement.setAttribute('aria-valuenow', answered);
        progressFill.parentElement.setAttribute('aria-valuemax', total);
    }

    function setNavFilter(filter) {
        navFilter = filter;
        updateFilterButtons();
        updateNavUI();
    }

    function updateFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === navFilter));
    }

    function matchesFilter(index, state) {
        if (navFilter === 'unanswered') return !state.isAnswered[index] && !draftComplete(index);
        if (navFilter === 'wrong') return state.answersStatus[index] === 'wrong';
        if (navFilter === 'bookmarked') return Boolean(state.bookmarks[index]);
        return true;
    }

    function updateNavUI() {
        if (!activeSectionId || !activeSectionData) return;
        const state = progressStore[activeSectionId];
        activeSectionData.forEach((_, index) => {
            const btn = document.getElementById(`nav-btn-${index}`);
            if (!btn) return;
            const classes = ['nav-btn'];
            const pending = !state.isAnswered[index] && draftComplete(index);
            if (!state.isAnswered[index] && !pending) classes.push('unanswered');
            if (pending) classes.push('answered-pending');
            if (index === currentQuestion) classes.push('current');
            if (state.answersStatus[index] === 'correct') classes.push('correct');
            else if (state.answersStatus[index] === 'wrong') classes.push('wrong');
            if (state.bookmarks[index]) classes.push('bookmarked');
            if (!matchesFilter(index, state)) classes.push('filtered-out');
            btn.className = classes.join(' ');
            btn.setAttribute('aria-current', index === currentQuestion ? 'true' : 'false');
        });

        const isBookmarked = Boolean(state.bookmarks[currentQuestion]);
        bookmarkBtn.classList.toggle('active', isBookmarked);
        bookmarkBtn.setAttribute('aria-pressed', String(isBookmarked));
        bookmarkBtn.setAttribute('aria-label', isBookmarked ? 'Bỏ đánh dấu câu này' : 'Đánh dấu câu này');
        bookmarkBtn.title = isBookmarked ? 'Bỏ đánh dấu câu này' : 'Đánh dấu câu này';
        bookmarkBtn.innerHTML = isBookmarked
            ? '<span class="tool-icon" aria-hidden="true">★</span><span class="tool-label-full">Đã đánh dấu</span><span class="tool-label-short">Đã đánh dấu</span>'
            : '<span class="tool-icon" aria-hidden="true">☆</span><span class="tool-label-full">Đánh dấu câu này</span><span class="tool-label-short">Đánh dấu</span>';
        updateStats();
        updateSidebarScore(activeSectionId, activeSectionData.length);
        updateMobileHeader('question');
    }

    function toggleBookmark() {
        if (!activeSectionId) return;
        const state = progressStore[activeSectionId];
        state.bookmarks[currentQuestion] = !state.bookmarks[currentQuestion];
        saveProgress();
        updateNavUI();
    }

    function saveDraftForCurrentQuestion() {
        if (!activeSectionId) return;
        const question = activeSectionData[currentQuestion];
        const state = progressStore[activeSectionId];
        if (state.isAnswered[currentQuestion]) return;

        if (question.type === 'single') {
            state.draftSelections[currentQuestion] = selectedOptions.size ? Array.from(selectedOptions)[0] : null;
        } else if (question.type === 'multiple') {
            state.draftSelections[currentQuestion] = Array.from(selectedOptions).sort((a, b) => a - b);
        } else if (question.type === 'tf') {
            state.draftSelections[currentQuestion] = tfDraft.slice();
        }

        saveProgress();
        updateNavUI();
        updateHelper();
    }

    function jumpToQuestion(index) {
        if (!activeSectionData || index < 0 || index >= activeSectionData.length) return;
        saveDraftForCurrentQuestion();
        currentQuestion = index;
        progressStore[activeSectionId].lastQuestion = index;
        saveProgress();
        loadQuestion();
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
        quizContainer.scrollIntoView({behavior, block:'start'});
    }


    function safePlainText(value) {
        const doc = new DOMParser().parseFromString(String(value ?? ''), 'text/html');
        doc.querySelectorAll('br').forEach(br => br.replaceWith(doc.createTextNode(' ')));
        return doc.body.textContent || '';
    }


    function getActiveStudyContextObject() {
        for (const subject of lmsData) {
            for (const chapter of subject.chapters || []) {
                const section = (chapter.sections || []).find(item => item.id === activeSectionId);
                if (section) {
                    return {
                        subject_id: subject.id,
                        subject_title: subject.title,
                        chapter_id: chapter.id,
                        chapter_title: chapter.title,
                        exercise_id: section.id,
                        exercise_title: section.title
                    };
                }
            }
        }
        return {};
    }

    function getActiveStudyContext() {
        const context = getActiveStudyContextObject();
        return [context.subject_title, context.chapter_title, context.exercise_title].filter(Boolean).join(' · ');
    }

    function buildAttemptSnapshot(state) {
        return (activeSectionData || []).map((question, index) => ({
            index,
            question_id: question.questionId || null,
            type: question.type || 'single',
            prompt: safePlainText(question.q),
            options: Array.isArray(question.options) ? question.options.map(safePlainText) : [],
            correct_answer: cloneSelection(question.answer),
            required_selections: Number(question.required || 1),
            selected_answer: cloneSelection(state.userSelections[index]),
            status: state.answersStatus[index] || 'unanswered',
            bookmarked: Boolean(state.bookmarks[index]),
            standard_reference: safePlainText(question.standardReference || '')
        }));
    }

    function queueAttemptRecord(state, metrics) {
        if (!state || state.attemptRecorded || state.attemptRecording || !activeSectionId) return;
        ensureAttemptRun(state);
        state.attemptRecording = true;
        saveProgress();
        const finishedAt = Date.now();
        const startedAt = validAttemptStartedAt(state.startedAt, finishedAt) ? Number(state.startedAt) : finishedAt;
        const durationSeconds = attemptDurationSeconds(startedAt, finishedAt);
        const provisional = {
            id: 'local:' + state.runId,
            exercise_id: activeSectionId,
            score: metrics.correct,
            total_questions: metrics.total,
            completed_at: new Date(finishedAt).toISOString()
        };
        const existingSummary = attemptSummaryByExercise.get(activeSectionId);
        if (!existingSummary) {
            attemptSummaryByExercise.set(activeSectionId, { latest: provisional, best: provisional, count: 1 });
        } else if (existingSummary.latest?.id !== provisional.id) {
            const bestPct = Number(existingSummary.best?.total_questions) > 0
                ? Number(existingSummary.best.score || 0) / Number(existingSummary.best.total_questions)
                : -1;
            const currentPct = metrics.total > 0 ? metrics.correct / metrics.total : 0;
            existingSummary.latest = provisional;
            existingSummary.count += 1;
            if (currentPct > bestPct) existingSummary.best = provisional;
        }
        updateSidebarScore(activeSectionId, metrics.total);

        window.dispatchEvent(new CustomEvent('lms:attempt-submitted', {
            detail: {
                exercise_id: activeSectionId,
                run_id: state.runId,
                started_at: new Date(startedAt).toISOString(),
                submitted_at: new Date(finishedAt).toISOString(),
                score: metrics.correct,
                total_questions: metrics.total,
                correct_count: metrics.correct,
                wrong_count: metrics.wrong,
                unanswered_count: metrics.unanswered,
                bookmarked_count: metrics.bookmarks,
                duration_seconds: durationSeconds,
                answers_status: state.answersStatus.slice(),
                selected_answers: state.userSelections.map(cloneSelection),
                bookmarks: state.bookmarks.slice(),
                question_snapshot: buildAttemptSnapshot(state),
                context_snapshot: getActiveStudyContextObject(),
                submitted_from: /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios-web' : 'web'
            }
        }));
    }

    window.addEventListener('lms:attempt-saved', event => {
        const detail = event.detail || {};
        const state = progressStore[detail.exercise_id];
        if (!state || state.runId !== detail.run_id) return;
        state.attemptRecorded = true;
        state.attemptRecording = false;
        saveProgress();
        updateSidebarScore(detail.exercise_id, localSectionLength(detail.exercise_id));
    });

    window.addEventListener('lms:attempt-save-failed', event => {
        const detail = event.detail || {};
        const state = progressStore[detail.exercise_id];
        if (!state || state.runId !== detail.run_id) return;
        state.attemptRecording = false;
        saveProgress();
    });

    window.getQuestionTranslationSource = () => {
        const q = activeSectionData?.[currentQuestion];
        if (!q) return null;
        return {
            sectionId: activeSectionId,
            questionIndex: currentQuestion,
            question: safePlainText(q.q),
            options: Array.isArray(q.options) ? q.options.map(safePlainText) : [],
            subject: getActiveStudyContext()
        };
    };

    window.applyQuestionTranslationView = (payload) => {
        const source = window.getQuestionTranslationSource();
        if (!source || !payload || payload.sectionId !== source.sectionId || payload.questionIndex !== source.questionIndex) return false;
        questionText.textContent = safePlainText(payload.question_text);
        const optionNodes = optionsContainer.querySelectorAll('.option-text, .tf-statement');
        optionNodes.forEach((node, index) => {
            if (payload.options?.[index] != null) node.textContent = safePlainText(payload.options[index]);
        });
        return true;
    };

    window.restoreQuestionOriginalView = () => {
        const q = activeSectionData?.[currentQuestion];
        if (!q) return false;
        questionText.textContent = safePlainText(q.q);
        const optionNodes = optionsContainer.querySelectorAll('.option-text, .tf-statement');
        optionNodes.forEach((node, index) => {
            if (q.options?.[index] != null) node.textContent = safePlainText(q.options[index]);
        });
        return true;
    };

    function loadQuestion() {
        explanationBox.classList.remove('show');
        explanationBox.innerHTML = '';
        validationMsg.textContent = '';
        optionsContainer.innerHTML = '';
        selectedOptions.clear();
        tfDraft = [];

        updateNavUI();
        prevBtn.style.visibility = currentQuestion > 0 ? 'visible' : 'hidden';
        const isLastQuestion = currentQuestion === activeSectionData.length - 1;
        nextBtn.textContent = isLastQuestion ? 'Nộp bài' : 'Câu tiếp theo';
        nextBtn.style.background = isLastQuestion ? '#ffb300' : '#1976d2';
        nextBtn.style.color = isLastQuestion ? '#000' : '#fff';
        nextBtn.style.visibility = 'visible';

        const question = activeSectionData[currentQuestion];
        const state = progressStore[activeSectionId];
        questionText.textContent = safePlainText(question.q);
        progressText.innerText = `Câu ${currentQuestion + 1} / ${activeSectionData.length}`;

        if (state.isAnswered[currentQuestion]) {
            renderAnsweredQuestion(question, state.userSelections[currentQuestion]);
            submitBtn.style.display = 'none';
            showExplanation(
                state.answersStatus[currentQuestion] === 'correct',
                question.expEng,
                question.expVie,
                question.exampleEng,
                question.exampleVie,
                question.standardReference
            );
        } else {
            const draft = state.draftSelections[currentQuestion];
            if (question.type === 'tf') renderTFQuestion(question, draft);
            else renderChoiceQuestion(question, draft);
            submitBtn.style.display = 'block';
            submitBtn.textContent = 'Kiểm tra đáp án (tùy chọn)';
            submitBtn.title = 'Có thể bỏ qua và chuyển câu.';
            updateSubmitState();
            updateHelper();
        }
        updateNavUI();
        window.dispatchEvent(new CustomEvent('lms:question-changed', {
            detail: { sectionId: activeSectionId, questionIndex: currentQuestion }
        }));
    }

    function createChoiceOption(opt, index, type, isSelected = false) {
        const optDiv = document.createElement('div');
        optDiv.className = `option ${type === 'single' ? 'single' : 'multiple'}${isSelected ? ' pending' : ''}`;
        optDiv.tabIndex = 0;
        optDiv.setAttribute('role', type === 'single' ? 'radio' : 'checkbox');
        optDiv.setAttribute(type === 'single' ? 'aria-checked' : 'aria-checked', String(isSelected));
        optDiv.onclick = () => handleChoiceClick(index, optDiv);
        optDiv.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoiceClick(index, optDiv); } };
        const textSpan = document.createElement('span');
        textSpan.className = 'option-text';
        textSpan.textContent = safePlainText(opt);
        const marker = document.createElement('span');
        marker.className = 'choice-marker';
        optDiv.appendChild(textSpan);
        optDiv.appendChild(marker);
        return optDiv;
    }

    function renderChoiceQuestion(q, draft) {
        const initial = q.type === 'single'
            ? (Number.isInteger(draft) ? [draft] : [])
            : (Array.isArray(draft) ? draft : []);
        selectedOptions = new Set(initial);
        q.options.forEach((opt, index) => optionsContainer.appendChild(createChoiceOption(opt, index, q.type, selectedOptions.has(index))));
    }

    function renderTFQuestion(q, draft) {
        tfDraft = Array.isArray(draft) && draft.length === q.options.length ? draft.slice() : new Array(q.options.length).fill(null);
        const list = document.createElement('div');
        list.className = 'tf-list';
        q.options.forEach((statement, index) => {
            const row = document.createElement('div');
            row.className = 'tf-row';
            row.dataset.index = index;
            const statementEl = document.createElement('div');
            statementEl.className = 'tf-statement';
            statementEl.textContent = safePlainText(statement);
            const actions = document.createElement('div');
            actions.className = 'tf-actions';
            [true, false].forEach(value => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `tf-choice${tfDraft[index] === value ? ' selected' : ''}`;
                btn.textContent = value ? 'True' : 'False';
                btn.onclick = () => selectTFAnswer(index, value);
                actions.appendChild(btn);
            });
            row.appendChild(statementEl);
            row.appendChild(actions);
            list.appendChild(row);
        });
        optionsContainer.appendChild(list);
    }

    function handleChoiceClick(index) {
        const q = activeSectionData[currentQuestion];
        const state = progressStore[activeSectionId];
        if (state.isAnswered[currentQuestion]) return;

        if (q.type === 'single') {
            selectedOptions.clear();
            selectedOptions.add(index);
            document.querySelectorAll('.option').forEach((el, i) => {
                const selected = i === index;
                el.classList.toggle('pending', selected);
                el.setAttribute('aria-checked', String(selected));
            });
        } else {
            if (selectedOptions.has(index)) {
                selectedOptions.delete(index);
            } else {
                if (selectedOptions.size >= q.required) {
                    validationMsg.textContent = `Câu này chỉ cần chọn ${q.required} đáp án. Hãy bỏ một lựa chọn trước.`;
                    return;
                }
                selectedOptions.add(index);
            }
            document.querySelectorAll('.option').forEach((el, i) => {
                const selected = selectedOptions.has(i);
                el.classList.toggle('pending', selected);
                el.setAttribute('aria-checked', String(selected));
            });
        }
        validationMsg.textContent = '';
        saveDraftForCurrentQuestion();
        updateSubmitState();
    }

    function selectTFAnswer(index, value) {
        const state = progressStore[activeSectionId];
        if (state.isAnswered[currentQuestion]) return;
        tfDraft[index] = value;
        const row = document.querySelector(`.tf-row[data-index="${index}"]`);
        row.querySelectorAll('.tf-choice').forEach(btn => btn.classList.toggle('selected', btn.textContent === (value ? 'True' : 'False')));
        saveDraftForCurrentQuestion();
        validationMsg.textContent = '';
        updateSubmitState();
    }

    function isDraftComplete() {
        const q = activeSectionData[currentQuestion];
        if (q.type === 'single') return selectedOptions.size === 1;
        if (q.type === 'multiple') return selectedOptions.size === q.required;
        return tfDraft.length === q.options.length && tfDraft.every(v => typeof v === 'boolean');
    }

    function updateSubmitState() {
        const ready = isDraftComplete();
        submitBtn.disabled = !ready;
        if (!ready) {
            const q = activeSectionData[currentQuestion];
            if (q.type === 'multiple' && selectedOptions.size > 0) validationMsg.textContent = `Đã chọn ${selectedOptions.size}/${q.required} đáp án.`;
            else if (q.type === 'tf') {
                const done = tfDraft.filter(v => typeof v === 'boolean').length;
                if (done > 0) validationMsg.textContent = `Đã trả lời ${done}/${q.options.length} nhận định.`;
            }
        } else {
            validationMsg.textContent = '';
        }
    }

    function getCurrentDraft(q) {
        if (q.type === 'single') return Array.from(selectedOptions)[0];
        if (q.type === 'multiple') return Array.from(selectedOptions).sort((a,b) => a-b);
        return tfDraft.slice();
    }

    function gradeAnswer(q, selection) {
        if (q.type === 'single') return selection === q.answer;
        if (q.type === 'multiple') {
            if (!Array.isArray(selection) || selection.length !== q.answer.length) return false;
            return q.answer.every(ans => selection.includes(ans));
        }
        return Array.isArray(selection) && selection.length === q.answer.length && q.answer.every((ans, i) => selection[i] === ans);
    }

    function checkCurrentAnswer() {
        const state = progressStore[activeSectionId];
        if (state.isAnswered[currentQuestion]) return;
        if (!isDraftComplete()) {
            validationMsg.textContent = 'Hãy hoàn thành lựa chọn trước khi kiểm tra đáp án.';
            return;
        }
        const q = activeSectionData[currentQuestion];
        const selection = getCurrentDraft(q);
        const isCorrect = gradeAnswer(q, selection);
        state.userSelections[currentQuestion] = Array.isArray(selection) ? selection.slice() : selection;
        state.draftSelections[currentQuestion] = null;
        state.isAnswered[currentQuestion] = true;
        state.answersStatus[currentQuestion] = isCorrect ? 'correct' : 'wrong';
        state.score = state.answersStatus.filter(x => x === 'correct').length;
        saveProgress();
        updateSidebarScore(activeSectionId, activeSectionData.length);
        loadQuestion();
    }

    function renderAnsweredQuestion(q, selection) {
        if (q.type === 'tf') {
            // V2 stored True selections as option indexes; V3 stores one boolean per statement.
            // Convert old saved progress on the fly so existing users do not lose history.
            const normalizedTFSelection = Array.isArray(selection)
                ? (selection.every(v => typeof v === 'boolean')
                    ? selection
                    : q.options.map((_, idx) => selection.includes(idx)))
                : new Array(q.options.length).fill(null);
            const list = document.createElement('div');
            list.className = 'tf-list';
            q.options.forEach((statement, index) => {
                const userValue = normalizedTFSelection[index];
                const correctValue = q.answer[index];
                const row = document.createElement('div');
                row.className = `tf-row ${userValue === correctValue ? 'correct' : 'wrong'}`;
                const statementEl = document.createElement('div');
                statementEl.className = 'tf-statement';
                statementEl.textContent = safePlainText(statement);
                const actions = document.createElement('div');
                actions.className = 'tf-actions';
                [true, false].forEach(value => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.disabled = true;
                    btn.className = `tf-choice${userValue === value ? ' user-answer selected' : ''}`;
                    btn.textContent = value ? 'True' : 'False';
                    actions.appendChild(btn);
                });
                row.appendChild(statementEl);
                row.appendChild(actions);
                if (userValue !== correctValue) {
                    const note = document.createElement('div');
                    note.className = 'tf-correct-note';
                    note.textContent = `Đáp án đúng: ${correctValue ? 'True' : 'False'}`;
                    row.appendChild(note);
                }
                list.appendChild(row);
            });
            optionsContainer.appendChild(list);
            return;
        }

        q.options.forEach((opt, index) => {
            const chosen = q.type === 'single' ? selection === index : Array.isArray(selection) && selection.includes(index);
            const correct = q.type === 'single' ? q.answer === index : q.answer.includes(index);
            const el = createChoiceOption(opt, index, q.type, false);
            el.tabIndex = -1;
            el.onclick = null;
            el.onkeydown = null;
            el.style.pointerEvents = 'none';
            if (correct) el.classList.add('correct');
            if (chosen && !correct) el.classList.add('wrong');
            if (chosen) el.querySelector('.choice-marker').style.background = correct ? '#4caf50' : '#ef5350';
            optionsContainer.appendChild(el);
        });
    }

    function showExplanation(isCorrect, textEng, textVie, exampleEng = '', exampleVie = '', standardReference = '') {
        const resultColor = isCorrect ? '#4caf50' : '#ef5350';
        const resultText = isCorrect ? 'Chính xác' : 'Chưa chính xác';
        explanationBox.style.borderLeftColor = resultColor;
        explanationBox.innerHTML = `
            <div class="explanation-toolbar">
                <span class="explanation-result" style="color:${resultColor}">${resultText}</span>
                <div class="explanation-lang">
                    <button class="lang-btn" type="button" data-lang="eng" onclick="setExplanationLang('eng')">EN</button>
                    <button class="lang-btn" type="button" data-lang="vie" onclick="setExplanationLang('vie')">VI</button>
                    <button class="lang-btn" type="button" data-lang="both" onclick="setExplanationLang('both')">EN + VI</button>
                </div>
            </div>

            <section class="explanation-language-block" id="eng-explanation-block">
                <div class="explanation-section-label">Explanation</div>
                <div class="eng-exp explanation-copy" id="eng-exp"></div>
                <div class="practical-example-card" id="eng-example-card" hidden>
                    <div class="practical-example-title">Practical example</div>
                    <div class="practical-example-copy" id="eng-example"></div>
                </div>
            </section>

            <section class="explanation-language-block" id="vie-explanation-block">
                <div class="explanation-section-label">Giải thích</div>
                <div class="vie-exp explanation-copy" id="vie-exp"></div>
                <div class="practical-example-card" id="vie-example-card" hidden>
                    <div class="practical-example-title">Ví dụ thực tế</div>
                    <div class="practical-example-copy" id="vie-example"></div>
                </div>
            </section>

            <div class="standard-reference" id="standard-reference" hidden>
                <span>Chuẩn tham chiếu</span>
                <strong id="standard-reference-text"></strong>
            </div>`;

        const engExp = document.getElementById('eng-exp');
        const vieExp = document.getElementById('vie-exp');
        const engExample = document.getElementById('eng-example');
        const vieExample = document.getElementById('vie-example');
        const engExampleCard = document.getElementById('eng-example-card');
        const vieExampleCard = document.getElementById('vie-example-card');
        const reference = document.getElementById('standard-reference');
        const referenceText = document.getElementById('standard-reference-text');

        if (engExp) engExp.textContent = safePlainText(textEng);
        if (vieExp) vieExp.textContent = safePlainText(textVie);

        const cleanEngExample = safePlainText(exampleEng);
        const cleanVieExample = safePlainText(exampleVie);
        if (engExample && cleanEngExample) {
            engExample.textContent = cleanEngExample;
            engExampleCard.hidden = false;
        }
        if (vieExample && cleanVieExample) {
            vieExample.textContent = cleanVieExample;
            vieExampleCard.hidden = false;
        }

        const cleanReference = safePlainText(standardReference);
        if (reference && referenceText && cleanReference) {
            referenceText.textContent = cleanReference;
            reference.hidden = false;
        }

        explanationBox.classList.add('show');
        applyExplanationLang();
    }

    function setExplanationLang(lang) {
        uiPrefs.explanationLang = lang;
        saveUIPrefs();
        applyExplanationLang();
    }

    function applyExplanationLang() {
        const engBlock = document.getElementById('eng-explanation-block');
        const vieBlock = document.getElementById('vie-explanation-block');
        if (!engBlock || !vieBlock) return;
        const lang = uiPrefs.explanationLang || 'both';
        engBlock.style.display = (lang === 'eng' || lang === 'both') ? 'block' : 'none';
        vieBlock.style.display = (lang === 'vie' || lang === 'both') ? 'block' : 'none';
        engBlock.classList.toggle('with-divider', lang === 'both');
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    }

    function nextQuestion() {
        saveDraftForCurrentQuestion();
        if (currentQuestion < activeSectionData.length - 1) {
            jumpToQuestion(currentQuestion + 1);
        } else {
            showResults(false);
        }
    }

    function prevQuestion() {
        saveDraftForCurrentQuestion();
        if (currentQuestion > 0) jumpToQuestion(currentQuestion - 1);
    }

    function cloneSelection(value) {
        return Array.isArray(value) ? value.slice() : value;
    }

    function gradeDrafts() {
        if (!activeSectionData || !activeSectionId) return;
        const state = progressStore[activeSectionId];

        activeSectionData.forEach((question, index) => {
            if (state.isAnswered[index] || !draftComplete(index)) return;
            const selection = cloneSelection(state.draftSelections[index]);
            state.userSelections[index] = cloneSelection(selection);
            state.draftSelections[index] = null;
            state.isAnswered[index] = true;
            state.answersStatus[index] = gradeAnswer(question, selection) ? 'correct' : 'wrong';
        });

        state.score = state.answersStatus.filter(x => x === 'correct').length;
        saveProgress();
        updateSidebarScore(activeSectionId, activeSectionData.length);
    }

    function showResults(force = false) {
        saveDraftForCurrentQuestion();

        const total = activeSectionData ? activeSectionData.length : 0;
        const completedDrafts = answeredCount();
        const incomplete = Math.max(total - completedDrafts, 0);

        if (incomplete > 0 && !force) {
            quizBody.style.display = 'none';
            scoreBoard.style.display = 'block';
            updateMobileHeader('results');
            scoreBoard.innerHTML = `
                <div class="result-card">
                    <div style="font-size:1.5rem;">Sẵn sàng nộp bài?</div>
                    <div class="warning-card">
                        Bạn đã trả lời <strong>${completedDrafts}/${total}</strong> câu.
                        Còn <strong>${incomplete}</strong> câu chưa có đáp án hoàn chỉnh.
                    </div>
                    <div class="result-actions">
                        <button class="submit-btn" style="display:inline-block;width:auto;" type="button" onclick="continueUnanswered()">Quay lại câu chưa làm</button>
                        <button class="utility-btn" type="button" onclick="showResults(true)">Nộp phần hiện tại</button>
                    </div>
                </div>`;
            return;
        }

        gradeDrafts();

        const state = progressStore[activeSectionId];
        const answered = state.isAnswered.filter(Boolean).length;
        const correct = state.answersStatus.filter(x => x === 'correct').length;
        const wrong = state.answersStatus.filter(x => x === 'wrong').length;
        const unanswered = total - answered;
        const bookmarks = state.bookmarks.filter(Boolean).length;

        quizBody.style.display = 'none';
        scoreBoard.style.display = 'block';
        updateMobileHeader('results');
        updateSidebarScore(activeSectionId, total);

        const percent = total ? Math.round((correct / total) * 100) : 0;
        const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
        queueAttemptRecord(state, { total, correct, wrong, unanswered, bookmarks });

        const message = percent === 100
            ? 'Tuyệt vời! Bạn nắm rất vững phần này.'
            : percent >= 70
                ? 'Kết quả tốt. Hãy ưu tiên ôn lại các câu sai.'
                : 'Nên ôn lại các câu sai trước khi làm lại toàn bộ phần này.';

        scoreBoard.innerHTML = `
            <div class="result-card">
                <div style="font-size:1.25rem;font-weight:750;">Kết quả bài làm</div>
                <div class="result-score">${correct} / ${total}</div>
                <div class="result-sub">${percent}% tổng điểm · Độ chính xác ${accuracy}%</div>
                <div class="result-grid">
                    <div class="result-metric"><b>${correct}</b><span>Đúng</span></div>
                    <div class="result-metric"><b>${wrong}</b><span>Sai</span></div>
                    <div class="result-metric"><b>${unanswered}</b><span>Chưa làm</span></div>
                    <div class="result-metric"><b>${bookmarks}</b><span>Đánh dấu</span></div>
                </div>
                <div class="result-sub">${message}</div>
                <div class="result-actions">
                    ${wrong ? '<button class="submit-btn" style="display:inline-block;width:auto;background:#c62828;" type="button" onclick="startReview(\'wrong\')">Ôn lại câu sai</button>' : ''}
                    ${bookmarks ? '<button class="utility-btn" type="button" onclick="startReview(\'bookmarked\')">Xem câu đánh dấu</button>' : ''}
                    ${unanswered ? '<button class="utility-btn" type="button" onclick="continueUnanswered()">Làm câu chưa làm</button>' : ''}
                    <a class="utility-btn history-result-link" href="history.html?exercise=${encodeURIComponent(activeSectionId)}">Xem lịch sử</a>
                    <button class="utility-btn danger-btn" type="button" onclick="resetSection()">Làm lại phần này</button>
                </div>
            </div>`;
    }

    function continueUnanswered() {
        scoreBoard.style.display = 'none';
        quizBody.style.display = 'block';
        const index = firstIncomplete();
        if (index >= 0) jumpToQuestion(index);
        else loadQuestion();
    }

    function startReview(type) {
        scoreBoard.style.display = 'none';
        quizBody.style.display = 'block';
        setNavFilter(type);
        const state = progressStore[activeSectionId];
        const idx = type === 'wrong'
            ? state.answersStatus.findIndex(x => x === 'wrong')
            : state.bookmarks.findIndex(Boolean);
        if (idx >= 0) jumpToQuestion(idx);
    }

    function resetSection() {
        if (!confirm('Bắt đầu lượt làm mới? Kết quả hiện tại đã được lưu trong Lịch sử làm bài. Đáp án sẽ được đặt lại, còn các câu bạn đã đánh dấu sao vẫn được giữ.')) return;

        const previousState = progressStore[activeSectionId];
        const preservedBookmarks = Array.isArray(previousState?.bookmarks)
            ? previousState.bookmarks.slice(0, activeSectionData.length).map(Boolean)
            : new Array(activeSectionData.length).fill(false);
        while (preservedBookmarks.length < activeSectionData.length) preservedBookmarks.push(false);

        const freshState = createEmptySectionState(activeSectionData.length);
        freshState.bookmarks = preservedBookmarks;
        progressStore[activeSectionId] = freshState;
        ensureAttemptRun(progressStore[activeSectionId]);

        currentQuestion = 0;
        navFilter = 'all';
        updateFilterButtons();
        saveProgress();
        updateSidebarScore(activeSectionId, activeSectionData.length);
        scoreBoard.style.display = 'none';
        quizBody.style.display = 'block';
        initNavGrid();
        loadQuestion();
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (!activeSectionData || quizContainer.style.display === 'none' || quizBody.style.display === 'none') return;
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;
        const state = progressStore[activeSectionId];
        const q = activeSectionData[currentQuestion];

        if (!state.isAnswered[currentQuestion] && q.type !== 'tf' && /^[1-9]$/.test(e.key)) {
            const idx = Number(e.key) - 1;
            if (idx < q.options.length) { e.preventDefault(); handleChoiceClick(idx); }
        } else if (e.key === 'Enter' && !submitBtn.disabled && !state.isAnswered[currentQuestion]) {
            e.preventDefault(); checkCurrentAnswer();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault(); prevQuestion();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault(); nextQuestion();
        } else if (e.key.toLowerCase() === 'b') {
            e.preventDefault(); toggleBookmark();
        } else if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Startup
    initSidebar();
    openRequestedExercise();
    updateAllSidebarScores();
    updateMobileHeader();
    updateResumeButton();
    syncResponsiveShell();
