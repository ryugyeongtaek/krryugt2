-- STEP 4: 자동 추정한 컬럼 매핑을 다음 업로드에서 재사용합니다.
drop policy if exists "관리자 매핑 저장" on core.column_mapping;
create policy "관리자 매핑 저장" on core.column_mapping for all to authenticated using (core.is_admin()) with check (core.is_admin());
