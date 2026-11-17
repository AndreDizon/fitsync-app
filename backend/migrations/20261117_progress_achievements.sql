begin;
alter table public.progress_awards drop constraint if exists progress_awards_code_check;
alter table public.progress_awards add constraint progress_awards_code_check check(code in ('hello','streak3','streak7','streak14','streak30','streak60','todo1','todo10','todo25','todo100','todo250','todo500','workout1','workout5','workout10','workout25','workout50','workout100','food1','food10','food25','food50','food100','food250','journal1','journal3','journal7','journal14','journal30','journal60'));
notify pgrst,'reload schema';
commit;
