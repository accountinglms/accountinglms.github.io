// Synthetic source with details that must survive import, draft edits and publication.
export const fidelityQuestion={
  question_type:'single',
  prompt:'12. On 1 January 20X6, North Ltd received £12,000, excluding VAT, for six months of support.\nThe contract is non-cancellable. Support is provided evenly, but the customer has NOT received any goods. Ignore tax and assume that no amounts are refundable.\n\nPeriod | Cash received | Months of support delivered\nJanuary–February | £12,000 | 2 of 6\nMarch–June | £0 | 4 of 6\n\nWhich ONE statement is correct at 28 February 20X6? Show the calculation and distinguish revenue from cash received. Do not assume that all cash receipts are revenue.',
  options:[
    'A. Recognise revenue of £12,000 immediately because the cash has been received; no contract liability remains even though four months of support have not yet been provided.',
    'B. Recognise revenue of £4,000 and a contract liability of £8,000.\nCalculation: £12,000 ÷ 6 months × 2 months = £4,000; the remaining 4 months × £2,000 = £8,000.',
    'C. Recognise no revenue until 30 June 20X6, when all six months of support have been completed; present the whole £12,000 as a liability at 28 February.',
    'D. Recognise revenue of £8,000 because four months remain, and present £4,000 as a receivable even though the customer has already paid in full.'
  ],
  correct_answer:1,required_selections:1,confidence:.95,verification_status:'source_only',
  explanation_en:'Answer: B.\nStep 1: Monthly support revenue = £12,000 ÷ 6 = £2,000.\nStep 2: Revenue earned by 28 February = £2,000 × 2 = £4,000.\nStep 3: Contract liability for undelivered support = £12,000 − £4,000 = £8,000.\n\nA is incorrect because receiving cash does not by itself mean that all services have been delivered. C is incorrect because the customer receives support over time, rather than only at the end of June. D reverses the delivered and undelivered periods and incorrectly records a receivable after payment. The full £12,000 remains a cash receipt; only £4,000 is revenue for this period.',
  explanation_vi:'Đáp án: B.\nBước 1: Doanh thu hỗ trợ mỗi tháng = £12.000 ÷ 6 = £2.000.\nBước 2: Doanh thu đến ngày 28 tháng 2 = £2.000 × 2 = £4.000.\nBước 3: Nợ phải trả hợp đồng cho phần hỗ trợ chưa cung cấp = £12.000 − £4.000 = £8.000.\n\nA sai vì nhận tiền chưa có nghĩa là đã cung cấp toàn bộ dịch vụ. C sai vì khách hàng nhận hỗ trợ trong suốt thời gian hợp đồng, không chỉ vào cuối tháng 6. D đảo ngược phần đã cung cấp và chưa cung cấp, đồng thời ghi nhận sai khoản phải thu sau khi khách đã trả đủ tiền. Toàn bộ £12.000 là tiền thực nhận; chỉ £4.000 là doanh thu của kỳ này.',
  source_file:1,source_files:[1],source_page:1
};
