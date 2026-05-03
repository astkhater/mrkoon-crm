UPDATE leads
SET stage = CASE
  WHEN company_name ILIKE 'AGRANA Nile Fruits' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Al Safwa Industries' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Al Tawakol For Electrical Industries - NTT' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Alamal Elsherif' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'AudioTec Eg' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Ceramica Royal' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'Egyptian German Automotive ""EGA""' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'El Mansour Group' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'El Sewedy Electric' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'Ezz-Elarab Automotive' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Gila ElTawakol Electric' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Global Tronics' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Hilton Hospitaliy' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'INTECH' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'Kandil Steel' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'LATT Logistics' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'Mopco' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Mylerz SC' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Pachin' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'Raya Electric' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Redcon Construction' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Samsung electronics egypt' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'TBS' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'TITAN Cement Egypt' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'TMG Autrium Egypt' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Travco Group' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Wadi Degla' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'شركه ابناء الغريب الدريني للاعمال الهندسيه والميكانيكيه' AND assigned_to::text LIKE '4f20c17a%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'شركه سوبر بلاست للعبوات الحديثه' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'CSCEC' AND assigned_to::text LIKE '4f20c17a%' THEN 'prospect_cold'::pipeline_stage
  WHEN company_name ILIKE 'al-Dahhan Restaurants' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'Alamin For Modern Industries' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'Delta' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Egyptian Agriculture Services & Trade Co. ( EGAST )' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'El Basha For Textiles and Laces' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Itamco for agriculture development' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'KUWADICO (التنميه العمرانيه)' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'MEMICO' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Miras' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'scimitar production' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'SEGMENT CO FOR CONSTRUCTION' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'TCI SANMAR CHEMICALS SAE' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'Venus for paper and carton' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Yes Pac' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'الشركة الصينيه المصريه للمواد الغذائيه' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'الشركة المصرية السويدية لأسلاك اللحام' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'الشركه العربيه المنيري للشحن والصناعة والتجارة' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'القطاميه للاستثمارات العقاريه والتنمية. قطاميه هايتس' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'المصريه' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'اولاد لبنه للاستيراد والتصدير' AND assigned_to::text LIKE '8159d5c4%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'جيلا الكتريك' AND assigned_to::text LIKE '8159d5c4%' THEN 'client_renewal'::pipeline_stage
  WHEN company_name ILIKE 'دوباك' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'ساشيكو' AND assigned_to::text LIKE '8159d5c4%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'شركة BICC للكابلات' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'شركة نقل اليكس ترانس' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'شركه ماريا للتجاره والصناعه' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'صافولا للاغذية' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'طيبة' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'غالي باك' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'مجموعه مصر للصلب' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'نادي نيو جيزة' AND assigned_to::text LIKE '8159d5c4%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'cairo  guys' AND assigned_to::text LIKE '8159d5c4%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Credit Agricole Egypt' AND assigned_to::text LIKE '8159d5c4%' THEN 'unqualified'::pipeline_stage
  WHEN company_name ILIKE 'Roots Group' AND assigned_to::text LIKE '8159d5c4%' THEN 'negotiation'::pipeline_stage
  WHEN company_name ILIKE 'El-Sallab Steel' AND assigned_to::text LIKE '8159d5c4%' THEN 'lost'::pipeline_stage
  WHEN company_name ILIKE 'Alx Panel' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'Amer Group' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'B- tech' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'freelance' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Miser' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Mitsubishi Motors Egypt' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'Shift EV' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'sun rise' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_cold'::pipeline_stage
  WHEN company_name ILIKE 'الشركة الهندسية للحاويات' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'مجموعه مصر الحجاز' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'يونيون لتصنيع البطاريات' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_inactive'::pipeline_stage
  WHEN company_name ILIKE 'Sumitomo' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_active'::pipeline_stage
  WHEN company_name ILIKE 'Sumitomo Electric Egypt (SEWS-EGY)' AND assigned_to::text LIKE 'decf9e1e%' THEN 'client_active'::pipeline_stage
  WHEN company_name ILIKE 'EVA Pharma for Pharmaceutical Industries Com. (EVAPHARMA)' AND assigned_to::text LIKE 'decf9e1e%' THEN 'prospect_active'::pipeline_stage
  ELSE stage
END
WHERE company_name ILIKE ANY(ARRAY[
  'AGRANA Nile Fruits',
  'Al Safwa Industries',
  'Al Tawakol For Electrical Industries - NTT',
  'Alamal Elsherif',
  'AudioTec Eg',
  'Ceramica Royal',
  'Egyptian German Automotive ""EGA""',
  'El Mansour Group',
  'El Sewedy Electric',
  'Ezz-Elarab Automotive',
  'Gila ElTawakol Electric',
  'Global Tronics',
  'Hilton Hospitaliy',
  'INTECH',
  'Kandil Steel',
  'LATT Logistics',
  'Mopco',
  'Mylerz SC',
  'Pachin',
  'Raya Electric',
  'Redcon Construction',
  'Samsung electronics egypt',
  'TBS',
  'TITAN Cement Egypt',
  'TMG Autrium Egypt',
  'Travco Group',
  'Wadi Degla',
  'شركه ابناء الغريب الدريني للاعمال الهندسيه والميكانيكيه',
  'شركه سوبر بلاست للعبوات الحديثه',
  'CSCEC',
  'al-Dahhan Restaurants',
  'Alamin For Modern Industries',
  'Delta',
  'Egyptian Agriculture Services & Trade Co. ( EGAST )',
  'El Basha For Textiles and Laces',
  'Itamco for agriculture development',
  'KUWADICO (التنميه العمرانيه)',
  'MEMICO',
  'Miras',
  'scimitar production',
  'SEGMENT CO FOR CONSTRUCTION',
  'TCI SANMAR CHEMICALS SAE',
  'Venus for paper and carton',
  'Yes Pac',
  'الشركة الصينيه المصريه للمواد الغذائيه',
  'الشركة المصرية السويدية لأسلاك اللحام',
  'الشركه العربيه المنيري للشحن والصناعة والتجارة',
  'القطاميه للاستثمارات العقاريه والتنمية. قطاميه هايتس',
  'المصريه',
  'اولاد لبنه للاستيراد والتصدير',
  'جيلا الكتريك',
  'دوباك',
  'ساشيكو',
  'شركة BICC للكابلات',
  'شركة نقل اليكس ترانس',
  'شركه ماريا للتجاره والصناعه',
  'صافولا للاغذية',
  'طيبة',
  'غالي باك',
  'مجموعه مصر للصلب',
  'نادي نيو جيزة',
  'cairo  guys',
  'Credit Agricole Egypt',
  'Roots Group',
  'El-Sallab Steel',
  'Alx Panel',
  'Amer Group',
  'B- tech',
  'freelance',
  'Miser',
  'Mitsubishi Motors Egypt',
  'Shift EV',
  'sun rise',
  'الشركة الهندسية للحاويات',
  'مجموعه مصر الحجاز',
  'يونيون لتصنيع البطاريات',
  'Sumitomo',
  'Sumitomo Electric Egypt (SEWS-EGY)',
  'EVA Pharma for Pharmaceutical Industries Com. (EVAPHARMA)'
]);

SELECT stage, COUNT(*) FROM leads
WHERE company_name ILIKE ANY(ARRAY['AGRANA Nile Fruits',
  'Al Safwa Industries',
  'Al Tawakol For Electrical Industries - NTT',
  'Alamal Elsherif',
  'AudioTec Eg',
  'Ceramica Royal',
  'Egyptian German Automotive ""EGA""',
  'El Mansour Group',
  'El Sewedy Electric',
  'Ezz-Elarab Automotive',
  'Gila ElTawakol Electric',
  'Global Tronics',
  'Hilton Hospitaliy',
  'INTECH',
  'Kandil Steel',
  'LATT Logistics',
  'Mopco',
  'Mylerz SC',
  'Pachin',
  'Raya Electric',
  'Redcon Construction',
  'Samsung electronics egypt',
  'TBS',
  'TITAN Cement Egypt',
  'TMG Autrium Egypt',
  'Travco Group',
  'Wadi Degla',
  'شركه ابناء الغريب الدريني للاعمال الهندسيه والميكانيكيه',
  'شركه سوبر بلاست للعبوات الحديثه',
  'CSCEC',
  'al-Dahhan Restaurants',
  'Alamin For Modern Industries',
  'Delta',
  'Egyptian Agriculture Services & Trade Co. ( EGAST )',
  'El Basha For Textiles and Laces',
  'Itamco for agriculture development',
  'KUWADICO (التنميه العمرانيه)',
  'MEMICO',
  'Miras',
  'scimitar production',
  'SEGMENT CO FOR CONSTRUCTION',
  'TCI SANMAR CHEMICALS SAE',
  'Venus for paper and carton',
  'Yes Pac',
  'الشركة الصينيه المصريه للمواد الغذائيه',
  'الشركة المصرية السويدية لأسلاك اللحام',
  'الشركه العربيه المنيري للشحن والصناعة والتجارة',
  'القطاميه للاستثمارات العقاريه والتنمية. قطاميه هايتس',
  'المصريه',
  'اولاد لبنه للاستيراد والتصدير',
  'جيلا الكتريك',
  'دوباك',
  'ساشيكو',
  'شركة BICC للكابلات',
  'شركة نقل اليكس ترانس',
  'شركه ماريا للتجاره والصناعه',
  'صافولا للاغذية',
  'طيبة',
  'غالي باك',
  'مجموعه مصر للصلب',
  'نادي نيو جيزة',
  'cairo  guys',
  'Credit Agricole Egypt',
  'Roots Group',
  'El-Sallab Steel',
  'Alx Panel',
  'Amer Group',
  'B- tech',
  'freelance',
  'Miser',
  'Mitsubishi Motors Egypt',
  'Shift EV',
  'sun rise',
  'الشركة الهندسية للحاويات',
  'مجموعه مصر الحجاز',
  'يونيون لتصنيع البطاريات',
  'Sumitomo',
  'Sumitomo Electric Egypt (SEWS-EGY)',
  'EVA Pharma for Pharmaceutical Industries Com. (EVAPHARMA)'])
GROUP BY stage ORDER BY count DESC;