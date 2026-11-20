create or replace function public.hyperpop_login(p_username text,p_password text)
returns jsonb language plpgsql security definer
set search_path to 'extensions','public'
as $function$
declare v_id uuid; v_username text; v_token uuid; v_reason text;
begin
 select id,username into v_id,v_username from public.hyperpop_accounts
 where lower(username)=lower(p_username) and password_hash=crypt(p_password,password_hash) limit 1;
 if v_id is null then return jsonb_build_object('ok',false,'error','Username or password is incorrect.'); end if;
 select reason into v_reason from public.hyperpop_sentinel_bans
 where account_id=v_id and revoked_at is null and (expires_at is null or expires_at>now())
 order by created_at desc limit 1;
 if v_reason is not null then return jsonb_build_object('ok',false,'error','This account is banned from Hyper-Pop. Reason: '||v_reason); end if;
 delete from public.hyperpop_sessions where account_id=v_id and expires_at<now();
 insert into public.hyperpop_sessions(account_id) values(v_id) returning token into v_token;
 return jsonb_build_object('ok',true,'token',v_token,'username',v_username);
end;
$function$;
