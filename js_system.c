/* js_system.c */

/* Synchronet JavaScript "system" Object */

/* $Id$ */

/****************************************************************************
 * @format.tab-size 4		(Plain Text/Source Code File Header)			*
 * @format.use-tabs true	(see http://www.synchro.net/ptsc_hdr.html)		*
 *																			*
 * Copyright 2003 Rob Swindell - http://www.synchro.net/copyright.html		*
 *																			*
 * This program is free software; you can redistribute it and/or			*
 * modify it under the terms of the GNU General Public License				*
 * as published by the Free Software Foundation; either version 2			*
 * of the License, or (at your option) any later version.					*
 * See the GNU General Public License for more details: gpl.txt or			*
 * http://www.fsf.org/copyleft/gpl.html										*
 *																			*
 * Anonymous FTP access to the most recent released source is available at	*
 * ftp://vert.synchro.net, ftp://cvs.synchro.net and ftp://ftp.synchro.net	*
 *																			*
 * Anonymous CVS access to the development source and modification history	*
 * is available at cvs.synchro.net:/cvsroot/sbbs, example:					*
 * cvs -d :pserver:anonymous@cvs.synchro.net:/cvsroot/sbbs login			*
 *     (just hit return, no password is necessary)							*
 * cvs -d :pserver:anonymous@cvs.synchro.net:/cvsroot/sbbs checkout src		*
 *																			*
 * For Synchronet coding style and modification guidelines, see				*
 * http://www.synchro.net/source.html										*
 *																			*
 * You are encouraged to submit any modifications (preferably in Unix diff	*
 * format) via e-mail to mods@synchro.net									*
 *																			*
 * Note: If this box doesn't appear square, then you need to fix your tabs.	*
 ****************************************************************************/

#include "sbbs.h"

#ifdef JAVASCRIPT

/* System Object Properites */
enum {
	 SYS_PROP_NAME
	,SYS_PROP_OP
	,SYS_PROP_ID
	,SYS_PROP_MISC
	,SYS_PROP_PSNAME
	,SYS_PROP_PSNUM
	,SYS_PROP_INETADDR
	,SYS_PROP_LOCATION
	,SYS_PROP_TIMEZONE
	,SYS_PROP_PWDAYS
	,SYS_PROP_DELDAYS

	,SYS_PROP_LASTUSER
	,SYS_PROP_LASTUSERON
	,SYS_PROP_FREEDISKSPACE
	,SYS_PROP_FREEDISKSPACEK

	,SYS_PROP_NODES
	,SYS_PROP_LASTNODE

	,SYS_PROP_NEW_PASS
	,SYS_PROP_NEW_MAGIC
	,SYS_PROP_NEW_LEVEL
	,SYS_PROP_NEW_FLAGS1
	,SYS_PROP_NEW_FLAGS2
	,SYS_PROP_NEW_FLAGS3
	,SYS_PROP_NEW_FLAGS4
	,SYS_PROP_NEW_REST
	,SYS_PROP_NEW_EXEMPT
	,SYS_PROP_NEW_CDT
	,SYS_PROP_NEW_MIN
	,SYS_PROP_NEW_SHELL
	,SYS_PROP_NEW_XEDIT
	,SYS_PROP_NEW_MISC
	,SYS_PROP_NEW_PROT
	,SYS_PROP_NEW_EXPIRE
	,SYS_PROP_NEW_UQ

	,SYS_PROP_EXPIRED_LEVEL
	,SYS_PROP_EXPIRED_FLAGS1
	,SYS_PROP_EXPIRED_FLAGS2
	,SYS_PROP_EXPIRED_FLAGS3
	,SYS_PROP_EXPIRED_FLAGS4
	,SYS_PROP_EXPIRED_REST
	,SYS_PROP_EXPIRED_EXEMPT

	/* directories */
	,SYS_PROP_NODE_DIR
	,SYS_PROP_CTRL_DIR
	,SYS_PROP_DATA_DIR
	,SYS_PROP_TEXT_DIR
	,SYS_PROP_TEMP_DIR
	,SYS_PROP_EXEC_DIR
	,SYS_PROP_MODS_DIR
	,SYS_PROP_LOGS_DIR

};

static JSBool js_system_get(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
	char		str[128];
	char*		p=NULL;
    jsint       tiny;
	JSString*	js_str;
	ulong		val;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

    tiny = JSVAL_TO_INT(id);

	switch(tiny) {
		case SYS_PROP_NAME:
	        p=cfg->sys_name;
			break;
		case SYS_PROP_OP:
			p=cfg->sys_op;
			break;
		case SYS_PROP_ID:
			p=cfg->sys_id;
			break;
		case SYS_PROP_MISC:
			JS_NewNumberValue(cx,cfg->sys_misc,vp);
			break;
		case SYS_PROP_PSNAME:
			p=cfg->sys_psname;
			break;
		case SYS_PROP_PSNUM:
			*vp = INT_TO_JSVAL(cfg->sys_psnum);
			break;
		case SYS_PROP_INETADDR:
			p=cfg->sys_inetaddr;
			break;
		case SYS_PROP_LOCATION:
			p=cfg->sys_location;
			break;
		case SYS_PROP_TIMEZONE:
			*vp = INT_TO_JSVAL(cfg->sys_timezone);
			break;
		case SYS_PROP_NODES:
			*vp = INT_TO_JSVAL(cfg->sys_nodes);
			break;
		case SYS_PROP_LASTNODE:
			*vp = INT_TO_JSVAL(cfg->sys_lastnode);
			break;
		case SYS_PROP_PWDAYS:
			*vp = INT_TO_JSVAL(cfg->sys_pwdays);
			break;
		case SYS_PROP_DELDAYS:
			*vp = INT_TO_JSVAL(cfg->sys_deldays);
			break;
		case SYS_PROP_LASTUSER:
			*vp = INT_TO_JSVAL(lastuser(cfg));
			break;
		case SYS_PROP_LASTUSERON:
			p=lastuseron;
			break;
		case SYS_PROP_FREEDISKSPACE:
		case SYS_PROP_FREEDISKSPACEK:
			if(tiny==SYS_PROP_FREEDISKSPACE)
				val = getfreediskspace(cfg->temp_dir,0);
			else
				val = getfreediskspace(cfg->temp_dir,1024);
			if(INT_FITS_IN_JSVAL(val) && !(val&0x80000000))
				*vp = INT_TO_JSVAL(val);
			else
	            JS_NewDoubleValue(cx, val, vp);
			break;

		case SYS_PROP_NEW_PASS:
			p=cfg->new_magic;
			break;
		case SYS_PROP_NEW_MAGIC:
			p=cfg->new_pass;
			break;
		case SYS_PROP_NEW_LEVEL:
			*vp = INT_TO_JSVAL(cfg->new_level);
			break;
		case SYS_PROP_NEW_FLAGS1:
			*vp = INT_TO_JSVAL(cfg->new_flags1);
			break;
		case SYS_PROP_NEW_FLAGS2:
			*vp = INT_TO_JSVAL(cfg->new_flags2);
			break;
		case SYS_PROP_NEW_FLAGS3:
			*vp = INT_TO_JSVAL(cfg->new_flags3);
			break;
		case SYS_PROP_NEW_FLAGS4:
			*vp = INT_TO_JSVAL(cfg->new_flags4);
			break;
		case SYS_PROP_NEW_REST:
			*vp = INT_TO_JSVAL(cfg->new_rest);
			break;
		case SYS_PROP_NEW_EXEMPT:
			*vp = INT_TO_JSVAL(cfg->new_exempt);
			break;
		case SYS_PROP_NEW_CDT:
			JS_NewNumberValue(cx,cfg->new_cdt,vp);
			break;
		case SYS_PROP_NEW_MIN:
			JS_NewNumberValue(cx,cfg->new_min,vp);
			break;
		case SYS_PROP_NEW_SHELL:
			*vp = INT_TO_JSVAL(cfg->new_shell);
			break;
		case SYS_PROP_NEW_XEDIT:
			p=cfg->new_xedit;
			break;
		case SYS_PROP_NEW_MISC:
			JS_NewNumberValue(cx,cfg->new_misc,vp);
			break;
		case SYS_PROP_NEW_PROT:
			sprintf(str,"%c",cfg->new_prot);
			p=str;
			break;
		case SYS_PROP_NEW_EXPIRE:
			JS_NewNumberValue(cx,cfg->new_expire,vp);
			break;
		case SYS_PROP_NEW_UQ:
			JS_NewNumberValue(cx,cfg->uq,vp);
			break;

		case SYS_PROP_EXPIRED_LEVEL:
			*vp = INT_TO_JSVAL(cfg->expired_level);
			break;
		case SYS_PROP_EXPIRED_FLAGS1:
			*vp = INT_TO_JSVAL(cfg->expired_flags1);
			break;
		case SYS_PROP_EXPIRED_FLAGS2:
			*vp = INT_TO_JSVAL(cfg->expired_flags2);
			break;
		case SYS_PROP_EXPIRED_FLAGS3:
			*vp = INT_TO_JSVAL(cfg->expired_flags3);
			break;
		case SYS_PROP_EXPIRED_FLAGS4:
			*vp = INT_TO_JSVAL(cfg->expired_flags4);
			break;
		case SYS_PROP_EXPIRED_REST:
			*vp = INT_TO_JSVAL(cfg->expired_rest);
			break;
		case SYS_PROP_EXPIRED_EXEMPT:
			*vp = INT_TO_JSVAL(cfg->expired_exempt);
			break;
		case SYS_PROP_NODE_DIR:
			p=cfg->node_dir;
			break;
		case SYS_PROP_CTRL_DIR:
			p=cfg->ctrl_dir;
			break;
		case SYS_PROP_DATA_DIR:
			p=cfg->data_dir;
			break;
		case SYS_PROP_TEXT_DIR:
			p=cfg->text_dir;
			break;
		case SYS_PROP_TEMP_DIR:
			p=cfg->temp_dir;
			break;
		case SYS_PROP_EXEC_DIR:
			p=cfg->exec_dir;
			break;
		case SYS_PROP_MODS_DIR:
			p=cfg->mods_dir;
			break;
		case SYS_PROP_LOGS_DIR:
			p=cfg->logs_dir;
			break;
	}

	if(p!=NULL) {	/* string property */
		if((js_str=JS_NewStringCopyZ(cx, p))==NULL)
			return(JS_FALSE);
		*vp = STRING_TO_JSVAL(js_str);
	}

	return(JS_TRUE);
}

static JSBool js_system_set(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
    jsint       tiny;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

    tiny = JSVAL_TO_INT(id);

	switch(tiny) {
		case SYS_PROP_MISC:
			JS_ValueToInt32(cx, *vp, (int32*)&cfg->sys_misc);
			break;
	}

	return(TRUE);
}


#define SYSOBJ_FLAGS JSPROP_ENUMERATE|JSPROP_READONLY

static struct JSPropertySpec js_system_properties[] = {
/*		 name,		tinyid,				flags,				getter,	setter	*/

	{	"name",		SYS_PROP_NAME,		SYSOBJ_FLAGS,		NULL,	NULL },
	{	"operator",	SYS_PROP_OP,		SYSOBJ_FLAGS,		NULL,	NULL },
	{	"qwk_id",	SYS_PROP_ID,		SYSOBJ_FLAGS,		NULL,	NULL },
	{	"settings",	SYS_PROP_MISC,		JSPROP_ENUMERATE,	NULL,	NULL },
	{	"psname",	SYS_PROP_PSNAME,	SYSOBJ_FLAGS,		NULL,	NULL },
	{	"psnum",	SYS_PROP_PSNUM,		SYSOBJ_FLAGS,		NULL,	NULL },
	{	"inetaddr",	SYS_PROP_INETADDR,	SYSOBJ_FLAGS,		NULL,	NULL },
	{	"location",	SYS_PROP_LOCATION,	SYSOBJ_FLAGS,		NULL,	NULL },
	{	"timezone",	SYS_PROP_TIMEZONE,	SYSOBJ_FLAGS,		NULL,	NULL },
	{	"pwdays",	SYS_PROP_PWDAYS,	SYSOBJ_FLAGS,		NULL,	NULL },
	{	"deldays",	SYS_PROP_DELDAYS,	SYSOBJ_FLAGS,		NULL,	NULL },

	{	"lastuser",					SYS_PROP_LASTUSER		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"lastuseron",				SYS_PROP_LASTUSERON		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"freediskspace",			SYS_PROP_FREEDISKSPACE	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"freediskspacek",			SYS_PROP_FREEDISKSPACEK	,SYSOBJ_FLAGS,	NULL,	NULL },

	{	"nodes",					SYS_PROP_NODES,		SYSOBJ_FLAGS,		NULL,	NULL },
	{	"lastnode",					SYS_PROP_LASTNODE,	SYSOBJ_FLAGS,		NULL,	NULL },

	{	"newuser_password",			SYS_PROP_NEW_PASS		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_magic_word",		SYS_PROP_NEW_MAGIC		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_level",			SYS_PROP_NEW_LEVEL		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_flags1",			SYS_PROP_NEW_FLAGS1		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_flags2",			SYS_PROP_NEW_FLAGS2		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_flags3",			SYS_PROP_NEW_FLAGS3		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_flags4",			SYS_PROP_NEW_FLAGS4		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_restrictions",		SYS_PROP_NEW_REST		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_exemptions",		SYS_PROP_NEW_EXEMPT		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_credits",			SYS_PROP_NEW_CDT		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_minutes",			SYS_PROP_NEW_MIN		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_command_shell",	SYS_PROP_NEW_SHELL		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_editor",			SYS_PROP_NEW_XEDIT		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_settings",			SYS_PROP_NEW_MISC		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_download_protocol",SYS_PROP_NEW_PROT		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_expiration_days",	SYS_PROP_NEW_EXPIRE		,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"newuser_questions",		SYS_PROP_NEW_UQ			,SYSOBJ_FLAGS,	NULL,	NULL },

	{	"expired_level",			SYS_PROP_EXPIRED_LEVEL	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_flags1",			SYS_PROP_EXPIRED_FLAGS1	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_flags2",			SYS_PROP_EXPIRED_FLAGS2	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_flags3",			SYS_PROP_EXPIRED_FLAGS3	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_flags4",			SYS_PROP_EXPIRED_FLAGS4	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_restrictions",		SYS_PROP_EXPIRED_REST	,SYSOBJ_FLAGS,	NULL,	NULL },
	{	"expired_exemptions",		SYS_PROP_EXPIRED_EXEMPT	,SYSOBJ_FLAGS,	NULL,	NULL },	

	/* directories */
	{	"node_dir",					SYS_PROP_NODE_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"ctrl_dir",					SYS_PROP_CTRL_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"data_dir",					SYS_PROP_DATA_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"text_dir",					SYS_PROP_TEXT_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"temp_dir",					SYS_PROP_TEMP_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"exec_dir",					SYS_PROP_EXEC_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"mods_dir",					SYS_PROP_MODS_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	
	{	"logs_dir",					SYS_PROP_LOGS_DIR		,SYSOBJ_FLAGS,	NULL,	NULL },	

	{0}
};

#ifdef _DEBUG
static char* sys_prop_desc[] = {
	 "BBS name"
	,"operator name"
	,"system QWK-ID (for QWK packets)"
	,"settings bitfield (see <tt>SS_*</tt> in <tt>sbbsdefs.js</tt> for bit definitions)"
	,"PostLink name"
	,"PostLink system number"
	,"Internet address (host or domain name)"
	,"location (city, state)"
	,"timezone (use <i>system.zonestr()</i> to get string representation)"
	,"days between forced password changes"
	,"days to preserve deleted user records"

	,"last user record number in user database (includes deleted and inactive user records)"
	,"name of last user to logoff"
	,"amount of free disk space (in bytes)"
	,"amount of free disk space (in kilobytes)"

	,"total number of BBS nodes"
	,"last displayable node number"

	,"new user password"
	,"new user magic word"
	,"new user level"
	,"new user flag set #1"
	,"new user flag set #2"
	,"new user flag set #3"
	,"new user flag set #4"
	,"new user restriction flags"
	,"new user exemption flags"
	,"new user credits"
	,"new user extra minutes"
	,"new user command shell"
	,"new user external editor"
	,"new user settings"
	,"new user file transfer protocol (command key)"
	,"new user expiration days"
	,"new user questions bitfield (see <tt>UQ_*</tt> in <tt>sbbsdefs.js</tt> for bit definitions)"

	,"expired user level"
	,"expired user flag set #1"
	,"expired user flag set #2"
	,"expired user flag set #3"
	,"expired user flag set #4"
	,"expired user restriction flags"
	,"expired user exemption flags"

	/* directories */
	,"node directory"
	,"control file directory"
	,"data file directory"
	,"text file directory"
	,"temporary file directory"
	,"executable file directory"
	,"modified modules directory (optional)"
	,"log file directory"

	/* INSERT new tabled properties here */

	/* Manually created (non-tabled) properties */
	,"server's host name (usually the same as <i>system.inetaddr</i>)"
	,"Synchronet version number (e.g. '3.10')"
	,"Synchronet revision letter (e.g. 'k')"
	,"Synchronet full version information (e.g. '3.10k Beta Debug')"
	,"Synchronet version notice (includes version and platform)"
	,"platform description (e.g. 'Win32', 'Linux', 'FreeBSD')"
	,"socket library version information"
	,"message base library version information"
	,"compiler used to build Synchronet"
	,"date and time compiled"
	,"Synchronet copyright display"
	,"JavaScript engine version information"
	,"operating system version information"
	,"time/date system was brought online (in time_t format)"

	,NULL
};
#endif


static JSClass js_system_class = {
     "System"				/* name			*/
    ,JSCLASS_HAS_PRIVATE	/* flags		*/
	,JS_PropertyStub		/* addProperty	*/
	,JS_PropertyStub		/* delProperty	*/
	,js_system_get			/* getProperty	*/
	,js_system_set			/* setProperty	*/
	,JS_EnumerateStub		/* enumerate	*/
	,JS_ResolveStub			/* resolve		*/
	,JS_ConvertStub			/* convert		*/
	,JS_FinalizeStub		/* finalize		*/
};

/* System Stats Propertiess */
enum {
	 SYSSTAT_PROP_LOGONS
	,SYSSTAT_PROP_LTODAY
	,SYSSTAT_PROP_TIMEON
	,SYSSTAT_PROP_TTODAY
	,SYSSTAT_PROP_ULS
	,SYSSTAT_PROP_ULB
	,SYSSTAT_PROP_DLS
	,SYSSTAT_PROP_DLB
	,SYSSTAT_PROP_PTODAY
	,SYSSTAT_PROP_ETODAY
	,SYSSTAT_PROP_FTODAY
	,SYSSTAT_PROP_NUSERS

	,SYSSTAT_PROP_TOTALUSERS
	,SYSSTAT_PROP_TOTALFILES
	,SYSSTAT_PROP_TOTALMSGS
	,SYSSTAT_PROP_TOTALMAIL
	,SYSSTAT_PROP_FEEDBACK
};

static JSBool js_sysstats_get(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
    jsint       tiny;
	scfg_t*		cfg;
	stats_t		stats;
	uint		i;
	ulong		l;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

    tiny = JSVAL_TO_INT(id);

	if(!getstats(cfg, 0, &stats))
		return(FALSE);

	switch(tiny) {
		case SYSSTAT_PROP_LOGONS:
			JS_NewNumberValue(cx,stats.logons,vp);
			break;
		case SYSSTAT_PROP_LTODAY:
			JS_NewNumberValue(cx,stats.ltoday,vp);
			break;
		case SYSSTAT_PROP_TIMEON:
			JS_NewNumberValue(cx,stats.timeon,vp);
			break;
		case SYSSTAT_PROP_TTODAY:
			JS_NewNumberValue(cx,stats.ttoday,vp);
			break;
		case SYSSTAT_PROP_ULS:
			JS_NewNumberValue(cx,stats.uls,vp);
			break;
		case SYSSTAT_PROP_ULB:
			JS_NewNumberValue(cx,stats.ulb,vp);
			break;
		case SYSSTAT_PROP_DLS:
			JS_NewNumberValue(cx,stats.dls,vp);
			break;
		case SYSSTAT_PROP_DLB:
			JS_NewNumberValue(cx,stats.dlb,vp);
			break;
		case SYSSTAT_PROP_PTODAY:
			JS_NewNumberValue(cx,stats.ptoday,vp);
			break;
		case SYSSTAT_PROP_ETODAY:
			JS_NewNumberValue(cx,stats.etoday,vp);
			break;
		case SYSSTAT_PROP_FTODAY:
			JS_NewNumberValue(cx,stats.ftoday,vp);
			break;
		case SYSSTAT_PROP_NUSERS:
			JS_NewNumberValue(cx,stats.nusers,vp);
			break;

		case SYSSTAT_PROP_TOTALUSERS:
			*vp = INT_TO_JSVAL(total_users(cfg));
			break;
		case SYSSTAT_PROP_TOTALMSGS:
			l=0;
			for(i=0;i<cfg->total_subs;i++)
				l+=getposts(cfg,i); 
			JS_NewNumberValue(cx,l,vp); 
			break;
		case SYSSTAT_PROP_TOTALFILES:
			l=0;
			for(i=0;i<cfg->total_dirs;i++)
				l+=getfiles(cfg,i);
			JS_NewNumberValue(cx,l,vp);
			break;
		case SYSSTAT_PROP_TOTALMAIL:
			*vp = INT_TO_JSVAL(getmail(cfg, 0,0));
			break;
		case SYSSTAT_PROP_FEEDBACK:
			*vp = INT_TO_JSVAL(getmail(cfg, 1,0));
			break;
	}

	return(TRUE);
}

#define SYSSTAT_FLAGS JSPROP_ENUMERATE|JSPROP_READONLY

static struct JSPropertySpec js_sysstats_properties[] = {
/*		 name,						tinyid,						flags,			getter,	setter	*/

	{	"total_logons",				SYSSTAT_PROP_LOGONS,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"logons_today",				SYSSTAT_PROP_LTODAY,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_timeon",				SYSSTAT_PROP_TIMEON,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"timeon_today",				SYSSTAT_PROP_TTODAY,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_files",				SYSSTAT_PROP_TOTALFILES,	SYSSTAT_FLAGS,	NULL,	NULL },
	{	"files_uploaded_today",		SYSSTAT_PROP_ULS,			SYSSTAT_FLAGS,	NULL,	NULL },
	{	"bytes_uploaded_today",		SYSSTAT_PROP_ULB,			SYSSTAT_FLAGS,	NULL,	NULL },
	{	"files_downloaded_today",	SYSSTAT_PROP_DLS,			SYSSTAT_FLAGS,	NULL,	NULL },
	{	"bytes_downloaded_today",	SYSSTAT_PROP_DLB,			SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_messages",			SYSSTAT_PROP_TOTALMSGS,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"messages_posted_today",	SYSSTAT_PROP_PTODAY,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_email",				SYSSTAT_PROP_TOTALMAIL,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"email_sent_today",			SYSSTAT_PROP_ETODAY,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_feedback",			SYSSTAT_PROP_FEEDBACK,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"feedback_sent_today",		SYSSTAT_PROP_FTODAY,		SYSSTAT_FLAGS,	NULL,	NULL },
	{	"total_users",				SYSSTAT_PROP_TOTALUSERS,	SYSSTAT_FLAGS,	NULL,	NULL },
	{	"new_users_today",			SYSSTAT_PROP_NUSERS,		SYSSTAT_FLAGS,	NULL,	NULL },
	{0}
};

#ifdef _DEBUG
static char* sysstat_prop_desc[] = {
	 "total logons"
	,"logons today"
	,"total time used"
	,"time used today"
	,"total files in file bases"
	,"files uploaded today"
	,"bytes uploaded today"
	,"files downloaded today"
	,"bytes downloaded today"
	,"total messages in message bases"
	,"messages posted today"
	,"total messages in mail base"
	,"email sent today"
	,"total feedback messages waiting"
	,"feedback sent today"
	,"total user records (does not include deleted or inactive user records)"
	,"new users today"
	,NULL
};
#endif


static JSClass js_sysstats_class = {
     "Stats"				/* name			*/
    ,JSCLASS_HAS_PRIVATE	/* flags		*/
	,JS_PropertyStub		/* addProperty	*/
	,JS_PropertyStub		/* delProperty	*/
	,js_sysstats_get		/* getProperty	*/
	,JS_PropertyStub		/* setProperty	*/
	,JS_EnumerateStub		/* enumerate	*/
	,JS_ResolveStub			/* resolve		*/
	,JS_ConvertStub			/* convert		*/
	,JS_FinalizeStub		/* finalize		*/
};

static JSBool
js_alias(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		p;
	char		buf[128];
	JSString*	js_str;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if((js_str=JS_ValueToString(cx, argv[0]))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	if((p=JS_GetStringBytes(js_str))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	p=alias(cfg,p,buf);

	if((js_str = JS_NewStringCopyZ(cx, p))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}

static JSBool
js_username(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	int32		val;
	char		buf[128];
	JSString*	js_str;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	val=0;
	JS_ValueToInt32(cx,argv[0],&val);

	if((js_str = JS_NewStringCopyZ(cx, username(cfg,val,buf)))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}


static JSBool
js_matchuser(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		p;
	JSString*	js_str;
	scfg_t*		cfg;
	BOOL		sysop_alias=TRUE;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if((js_str=JS_ValueToString(cx, argv[0]))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	if(argc>1)
		JS_ValueToBoolean(cx,argv[1],&sysop_alias);

	if((p=JS_GetStringBytes(js_str))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	*rval = INT_TO_JSVAL(matchuser(cfg,p,sysop_alias));
	return(JS_TRUE);
}

static JSBool
js_matchuserdata(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		p;
	JSString*	js_str;
	int32		offset=0;
	int32		usernumber=0;
	int			len;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	JS_ValueToInt32(cx,argv[0],&offset);
	if((len=user_rec_len(offset))<0)
		return(JS_FALSE);

	if((js_str=JS_ValueToString(cx, argv[1]))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	if(argc>2)
		JS_ValueToInt32(cx,argv[2],&usernumber);

	if((p=JS_GetStringBytes(js_str))==NULL) {
		*rval = INT_TO_JSVAL(0);
		return(JS_TRUE);
	}

	*rval = INT_TO_JSVAL(userdatdupe(cfg,usernumber,offset,len,p,FALSE /* deleted users */));
	return(JS_TRUE);
}

static JSBool
js_trashcan(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		str;
	char*		can;
	JSString*	js_str;
	JSString*	js_can;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if((js_can=JS_ValueToString(cx, argv[0]))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((js_str=JS_ValueToString(cx, argv[1]))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((can=JS_GetStringBytes(js_can))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((str=JS_GetStringBytes(js_str))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	*rval = BOOLEAN_TO_JSVAL(trashcan(cfg,str,can));	// user args are reversed
	return(JS_TRUE);
}

static JSBool
js_findstr(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		str;
	char*		fname;
	JSString*	js_str;
	JSString*	js_fname;

	if((js_fname=JS_ValueToString(cx, argv[0]))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((js_str=JS_ValueToString(cx, argv[1]))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((fname=JS_GetStringBytes(js_fname))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	if((str=JS_GetStringBytes(js_str))==NULL) {
		*rval = BOOLEAN_TO_JSVAL(JS_FALSE);
		return(JS_TRUE);
	}

	*rval = BOOLEAN_TO_JSVAL(findstr(str,fname));	// user args are reversed
	return(JS_TRUE);
}


static JSBool
js_zonestr(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	JSString*	js_str;
	short		zone;
	int32		val=0;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if(argc<1)
		zone=cfg->sys_timezone;
	else {
		JS_ValueToInt32(cx,argv[0],&val);
		zone=(short)val;
	}

	if((js_str = JS_NewStringCopyZ(cx, zonestr(zone)))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}

// Returns a ctime()-like string in the system-preferred time format
static JSBool
js_timestr(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char		str[128];
	time_t		t=0;
	JSString*	js_str;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if(argc<1)
		t=time(NULL);	/* use current time */
	else
		JS_ValueToInt32(cx,argv[0],(int32*)&t);
	timestr(cfg,&t,str);
	if((js_str = JS_NewStringCopyZ(cx, str))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}


// Returns a mm/dd/yy or dd/mm/yy formated string
static JSBool
js_datestr(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char		str[128];
	time_t		t;
	JSString*	js_str;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	if(argc<1)
		t=time(NULL);	/* use current time */
	else {
		if(JSVAL_IS_STRING(argv[0])) {	/* convert from string to time_t? */
			*rval = INT_TO_JSVAL(
				dstrtounix(cfg,JS_GetStringBytes(JS_ValueToString(cx, argv[0]))));
			return(JS_TRUE);
		}
		t=JSVAL_TO_INT(argv[0]);
	}
	unixtodstr(cfg,t,str);
	if((js_str = JS_NewStringCopyZ(cx, str))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}

static JSBool
js_secondstr(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char		str[128];
	time_t		t=0;
	JSString*	js_str;

	*rval = JSVAL_NULL;

	if(argc<1)
		return(JS_TRUE);

	JS_ValueToInt32(cx,argv[0],(int32*)&t);
	sectostr(t,str);
	if((js_str = JS_NewStringCopyZ(cx, str))==NULL)
		return(JS_FALSE);

	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}

static JSBool
js_spamlog(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	uintN		i;
	char*		p;
	char*		prot=NULL;
	char*		action=NULL;
	char*		reason=NULL;
	char*		host=NULL;
	char*		ip_addr=NULL;
	char*		to=NULL;
	char*		from=NULL;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	for(i=0;i<argc;i++) {
		if(!JSVAL_IS_STRING(argv[i]))
			continue;
		p=JS_GetStringBytes(JS_ValueToString(cx, argv[i]));
		if(p==NULL)
			continue;
		if(prot==NULL)
			prot=p;
		else if(action==NULL)
			action=p;
		else if(reason==NULL)
			reason=p;
		else if(host==NULL)
			host=p;
		else if(ip_addr==NULL)
			ip_addr=p;
		else if(to==NULL)
			to=p;
		else if(from==NULL)
			from=p;
	}
	*rval = BOOLEAN_TO_JSVAL(spamlog(cfg,prot,action,reason,host,ip_addr,to,from));
	return(JS_TRUE);
}

static JSBool
js_hacklog(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	uintN		i;
	char*		p;
	char*		prot=NULL;
	char*		user=NULL;
	char*		text=NULL;
	char*		host=NULL;
	SOCKADDR_IN	addr;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	memset(&addr,0,sizeof(addr));
	for(i=0;i<argc;i++) {
		if(JSVAL_IS_INT(argv[i])) {
			if(addr.sin_addr.s_addr==0)
				addr.sin_addr.s_addr=JSVAL_TO_INT(argv[i]);
			else
				addr.sin_port=(ushort)JSVAL_TO_INT(argv[i]);
			continue;
		}
		if(!JSVAL_IS_STRING(argv[i]))
			continue;
		p=JS_GetStringBytes(JS_ValueToString(cx, argv[i]));
		if(p==NULL)
			continue;
		if(prot==NULL)
			prot=p;
		else if(user==NULL)
			user=p;
		else if(text==NULL)
			text=p;
		else if(host==NULL)
			host=p;
	}
	*rval = BOOLEAN_TO_JSVAL(hacklog(cfg,prot,user,text,host,&addr));
	return(JS_TRUE);
}

static JSBool
js_get_node_message(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		buf;
	int32		node_num;
	JSString*	js_str;
	scfg_t*		cfg;

	*rval = JSVAL_NULL;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	node_num=cfg->node_num;
	if(argc) 
		JS_ValueToInt32(cx,argv[0],&node_num);
	if(node_num<1)
		node_num=1;

	if((buf=getnmsg(cfg,node_num))==NULL)
		return(JS_TRUE);

	js_str=JS_NewStringCopyZ(cx, buf);
	free(buf);

	if(js_str==NULL)
		return(JS_FALSE);
	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}


static JSBool
js_put_node_message(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	int32		node=1;
	JSString*	js_msg;
	char*		msg;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	JS_ValueToInt32(cx,argv[0],&node);
	if(node<1)
		node=1;

	if((js_msg=JS_ValueToString(cx, argv[1]))==NULL) 
		return(JS_FALSE);

	if((msg=JS_GetStringBytes(js_msg))==NULL) 
		return(JS_FALSE);

	*rval = BOOLEAN_TO_JSVAL(putnmsg(cfg,node,msg)==0);

	return(JS_TRUE);
}

static JSBool
js_get_telegram(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		buf;
	int32		usernumber=1;
	JSString*	js_str;
	scfg_t*		cfg;

	*rval = JSVAL_NULL;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	JS_ValueToInt32(cx,argv[0],&usernumber);
	if(usernumber<1)
		usernumber=1;

	if((buf=getsmsg(cfg,usernumber))==NULL)
		return(JS_TRUE);

	js_str=JS_NewStringCopyZ(cx, buf);
	free(buf);

	if(js_str==NULL)
		return(JS_FALSE);
	*rval = STRING_TO_JSVAL(js_str);
	return(JS_TRUE);
}

static JSBool
js_put_telegram(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	int32		usernumber=1;
	JSString*	js_msg;
	char*		msg;
	scfg_t*		cfg;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	JS_ValueToInt32(cx,argv[0],&usernumber);
	if(usernumber<1)
		usernumber=1;

	if((js_msg=JS_ValueToString(cx, argv[1]))==NULL) 
		return(JS_FALSE);

	if((msg=JS_GetStringBytes(js_msg))==NULL) 
		return(JS_FALSE);

	*rval = BOOLEAN_TO_JSVAL(putsmsg(cfg,usernumber,msg)==0);

	return(JS_TRUE);
}

static JSBool
js_new_user(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	char*		alias;
	int			i;
	scfg_t*		cfg;
	user_t		user;
	JSObject*	userobj;

	if((cfg=(scfg_t*)JS_GetPrivate(cx,obj))==NULL)
		return(JS_FALSE);

	alias=JS_GetStringBytes(JS_ValueToString(cx,argv[0]));

	memset(&user,0,sizeof(user));

	user.sex=SP;
	SAFECOPY(user.alias,alias);

	/* statistics */
	user.firston=user.laston=user.pwmod=time(NULL);

	/* security */
	user.level=cfg->new_level;
	user.flags1=cfg->new_flags1;
	user.flags2=cfg->new_flags2;
	user.flags3=cfg->new_flags3;
	user.flags4=cfg->new_flags4;
	user.rest=cfg->new_rest;
	user.exempt=cfg->new_exempt;

	user.cdt=cfg->new_cdt;
	user.min=cfg->new_min;
	user.freecdt=cfg->level_freecdtperday[user.level];
	if(cfg->new_expire)
		user.expire=user.firston+((long)cfg->new_expire*24L*60L*60L);
	else
		user.expire=0;

	/* settings */
	if(cfg->total_fcomps)
		strcpy(user.tmpext,cfg->fcomp[0]->ext);
	else
		strcpy(user.tmpext,"ZIP");

	user.shell=cfg->new_shell;
	user.misc=cfg->new_misc|(AUTOTERM|COLOR);
	user.prot=cfg->new_prot;
	user.qwk=QWK_DEFAULT;

	for(i=0;i<cfg->total_xedits;i++)
		if(!stricmp(cfg->xedit[i]->code,cfg->new_xedit) && chk_ar(cfg,cfg->xedit[i]->ar,&user))
			break;
	if(i<cfg->total_xedits)
		user.xedit=i+1;

	i=newuserdat(cfg,&user);

	if(i==0) {
		userobj=js_CreateUserObject(cx, obj, cfg, "user", user.number);
		*rval = OBJECT_TO_JSVAL(userobj);
	} else
		*rval = INT_TO_JSVAL(i);

	return(JS_TRUE);
}

static JSBool
js_exec(JSContext *cx, JSObject *obj, uintN argc, jsval *argv, jsval *rval)
{
	*rval = INT_TO_JSVAL(system(JS_GetStringBytes(JS_ValueToString(cx, argv[0]))));
	
	return(JS_TRUE);
}


static jsMethodSpec js_system_functions[] = {
	{"username",		js_username,		1,	JSTYPE_STRING,	JSDOCSTR("number")
	,JSDOCSTR("returns name of user in specified user record <i>number</i>, or empty string if not found")
	},
	{"alias",			js_alias,			1,	JSTYPE_STRING,	JSDOCSTR("string alias")
	,JSDOCSTR("returns name of user that matches alias (if found in <tt>ctrl/alias.cfg</tt>)")
	},		
	{"matchuser",		js_matchuser,		1,	JSTYPE_NUMBER,	JSDOCSTR("string username [,bool sysop_alias]")
	,JSDOCSTR("exact user name matching, returns number of user whose name/alias matches <i>username</i> "
		" or 0 if not found, matches well-known sysop aliases by default")
	},		
	{"matchuserdata",	js_matchuserdata,	2,	JSTYPE_NUMBER,	JSDOCSTR("field, data [,usernumber]")
	,JSDOCSTR("search user database for data in a specific field (specified by offset), "
		"returns first matching user record number, optional <i>usernumber</i> specifies user record to skip")
	},
	{"trashcan",		js_trashcan,		2,	JSTYPE_BOOLEAN,	JSDOCSTR("string filename, search")
	,JSDOCSTR("search text/filename.can for pseudo-regexp")
	},		
	{"findstr",			js_findstr,			2,	JSTYPE_BOOLEAN,	JSDOCSTR("string filename, search")
	,JSDOCSTR("search any file for pseudo-regexp")
	},		
	{"zonestr",			js_zonestr,			0,	JSTYPE_STRING,	JSDOCSTR("[timezone]")
	,JSDOCSTR("convert time zone integer to string, defaults to system timezone if <i>timezone</i> not specified")
	},		
	{"timestr",			js_timestr,			0,	JSTYPE_STRING,	JSDOCSTR("[time]")
	,JSDOCSTR("convert time_t integer into a time string, "
		"defaults to current time if <i>time</i> not specified")
	},		
	{"datestr",			js_datestr,			0,	JSTYPE_STRING,	JSDOCSTR("[time]")
	,JSDOCSTR("convert time_t integer into a date string (in either <tt>MM/DD/YY</tt> or <tt>DD/MM/YY</tt> format), "
		"defaults to current date if <i>time</i> not specified")
	},		
	{"secondstr",		js_secondstr,		0,	JSTYPE_STRING,	JSDOCSTR("seconds")
	,JSDOCSTR("convert elapsed time in seconds into a string in <tt>hh:mm:ss</tt> format")
	},		
	{"spamlog",			js_spamlog,			6,	JSTYPE_BOOLEAN,	JSDOCSTR("[protocol, action, reason, host, ip, to, from]")
	,JSDOCSTR("log a suspected SPAM attempt")
	},		
	{"hacklog",			js_hacklog,			5,	JSTYPE_BOOLEAN,	JSDOCSTR("[protocol, user, text, host, ip, port]")
	,JSDOCSTR("log a suspected hack attempt")
	},		
	{"get_node_message",js_get_node_message,0,	JSTYPE_STRING,	JSDOCSTR("number node")
	,JSDOCSTR("read any messages waiting for the specified node and return in a single string")
	},		
	{"put_node_message",js_put_node_message,2,	JSTYPE_BOOLEAN,	JSDOCSTR("number node, string message")
	,JSDOCSTR("send a node a short text message, delivered immediately")
	},		
	{"get_telegram",	js_get_telegram,	1,	JSTYPE_STRING,	JSDOCSTR("number user")
	,JSDOCSTR("returns any short text messages waiting for the specified user")
	},		
	{"put_telegram",	js_put_telegram,	2,	JSTYPE_BOOLEAN,	JSDOCSTR("number user, string message")
	,JSDOCSTR("sends a user a short text message, delivered immediately or during next logon")
	},		
	{"newuser",			js_new_user,		1,	JSTYPE_ALIAS },
	{"new_user",		js_new_user,		1,	JSTYPE_OBJECT,	JSDOCSTR("name/alias")
	,JSDOCSTR("creates a new user record, returns a new <a href=#User>User</a> object representing the new user account")
	},
	{"exec",			js_exec,			1,	JSTYPE_NUMBER,	JSDOCSTR("command-line")
	,JSDOCSTR("executes a native system/shell command-line, returns 0 on success")
	},		
	{0}
};


/* node properties */
enum {
	/* raw node_t fields */
	 NODE_PROP_STATUS
	,NODE_PROP_ERRORS
	,NODE_PROP_ACTION
	,NODE_PROP_USERON
	,NODE_PROP_CONNECTION
	,NODE_PROP_MISC
	,NODE_PROP_AUX
	,NODE_PROP_EXTAUX
};

#ifdef _DEBUG
static char* node_prop_desc[] = {
	 "status (see <tt>nodedefs.js</tt> for valid values)"
	,"error counter"
	,"current user action (see <tt>nodedefs.js</tt>)"
	,"current user number"
	,"connection speed (<tt>0xffff</tt> = Telnet or RLogin)"
	,"miscellaneous bitfield (see <tt>nodedefs.js</tt>)"
	,"auxillary value"
	,"extended auxillary value"
	,NULL
};
#endif


static JSBool js_node_get(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
	uint		node_num;
    jsint       tiny;
	node_t		node;
	scfg_t*		cfg;
	JSObject*	sysobj;
	JSObject*	node_list;

	tiny = JSVAL_TO_INT(id);

	if((node_list=JS_GetParent(cx, obj))==NULL)
		return(JS_FALSE);

	if((sysobj=JS_GetParent(cx, node_list))==NULL)
		return(JS_FALSE);

	if((cfg=(scfg_t*)JS_GetPrivate(cx,sysobj))==NULL)
		return(JS_FALSE);

	node_num=(uint)JS_GetPrivate(cx,obj)>>1;

	memset(&node,0,sizeof(node));
	if(getnodedat(cfg, node_num, &node, NULL))
		return(JS_TRUE);
	
    switch(tiny) {
		case NODE_PROP_STATUS:
			*vp = INT_TO_JSVAL((int)node.status);
			break;
		case NODE_PROP_ERRORS:	
			*vp = INT_TO_JSVAL((int)node.errors);
			break;
		case NODE_PROP_ACTION:	
			*vp = INT_TO_JSVAL((int)node.action);
			break;
		case NODE_PROP_USERON:	
			*vp = INT_TO_JSVAL((int)node.useron);
			break;
		case NODE_PROP_CONNECTION:
			*vp = INT_TO_JSVAL((int)node.connection);
			break;
		case NODE_PROP_MISC:		
			*vp = INT_TO_JSVAL((int)node.misc);
			break;
		case NODE_PROP_AUX:		
			*vp = INT_TO_JSVAL((int)node.aux);
			break;
		case NODE_PROP_EXTAUX:	
			JS_NewNumberValue(cx,node.extaux,vp);
			break;
	}
	return(JS_TRUE);
}

static JSBool js_node_set(JSContext *cx, JSObject *obj, jsval id, jsval *vp)
{
	uint		node_num;
	int			file;
	jsint		val=0;
    jsint       tiny;
	node_t		node;
	scfg_t*		cfg;
	JSObject*	sysobj;
	JSObject*	node_list;

	if((node_list=JS_GetParent(cx, obj))==NULL)
		return(JS_FALSE);

	if((sysobj=JS_GetParent(cx, node_list))==NULL)
		return(JS_FALSE);

	if((cfg=(scfg_t*)JS_GetPrivate(cx,sysobj))==NULL)
		return(JS_FALSE);

	node_num=(uint)JS_GetPrivate(cx,obj)>>1;

	memset(&node,0,sizeof(node));
	if(getnodedat(cfg, node_num, &node, &file)) 
		return(JS_TRUE);

	if(JSVAL_IS_INT(*vp))
		JS_ValueToInt32(cx, *vp, &val);

	tiny = JSVAL_TO_INT(id);
	
    switch(tiny) {
		case NODE_PROP_STATUS:
			node.status=(BYTE)val;
			break;
		case NODE_PROP_ERRORS:	
			node.errors=(BYTE)val;
			break;
		case NODE_PROP_ACTION:	
			node.action=(BYTE)val;
			break;
		case NODE_PROP_USERON:	
			node.useron=(WORD)val;
			break;
		case NODE_PROP_CONNECTION:
			node.connection=(WORD)val;
			break;
		case NODE_PROP_MISC:		
			node.misc=(WORD)val;
			break;
		case NODE_PROP_AUX:		
			node.aux=(WORD)val;
			break;
		case NODE_PROP_EXTAUX:	
			node.extaux=val;
			break;
	}
	putnodedat(cfg,node_num,&node,file);

	return(JS_TRUE);
}

static struct JSPropertySpec js_node_properties[] = {
/*		 name,						tinyid,					flags,				getter,	setter	*/

/* raw node_t fields */
	{	"status",					NODE_PROP_STATUS,		JSPROP_ENUMERATE,	NULL,	NULL },
	{	"errors",					NODE_PROP_ERRORS,		JSPROP_ENUMERATE,	NULL,	NULL },
	{	"action",					NODE_PROP_ACTION,		JSPROP_ENUMERATE,	NULL,	NULL },
	{	"useron",					NODE_PROP_USERON,		JSPROP_ENUMERATE,	NULL,	NULL },
	{	"connection",				NODE_PROP_CONNECTION,	JSPROP_ENUMERATE,	NULL,	NULL },
	{	"misc",						NODE_PROP_MISC,			JSPROP_ENUMERATE,	NULL,	NULL },
	{	"aux",						NODE_PROP_AUX,			JSPROP_ENUMERATE,	NULL,	NULL },
	{	"extaux",					NODE_PROP_EXTAUX,		JSPROP_ENUMERATE,	NULL,	NULL },
	{0}
};

static JSClass js_node_class = {
     "Node"					/* name			*/
    ,JSCLASS_HAS_PRIVATE	/* flags		*/
	,JS_PropertyStub		/* addProperty	*/
	,JS_PropertyStub		/* delProperty	*/
	,js_node_get			/* getProperty	*/
	,js_node_set			/* setProperty	*/
	,JS_EnumerateStub		/* enumerate	*/
	,JS_ResolveStub			/* resolve		*/
	,JS_ConvertStub			/* convert		*/
	,JS_FinalizeStub		/* finalize		*/
};

extern const char* beta_version;

JSObject* DLLCALL js_CreateSystemObject(JSContext* cx, JSObject* parent
										,scfg_t* cfg, time_t uptime, char* host_name)
{
	char		str[256];
	uint		i;
	jsval		val;
	JSObject*	sysobj;
	JSObject*	statsobj;
	JSObject*	nodeobj;
	JSObject*	node_list;
	JSString*	js_str;

	sysobj = JS_DefineObject(cx, parent, "system", &js_system_class, NULL
		,JSPROP_ENUMERATE|JSPROP_READONLY);

	if(sysobj==NULL)
		return(NULL);

	if(!JS_SetPrivate(cx, sysobj, cfg))	/* Store a pointer to scfg_t */
		return(NULL);

	if(!JS_DefineProperties(cx, sysobj, js_system_properties))
		return(NULL);

	if (!js_DefineMethods(cx, sysobj, js_system_functions, FALSE)) 
		return(NULL);

#ifdef _DEBUG
	js_DescribeObject(cx,sysobj,"Global system-related properties and methods");
	js_CreateArrayOfStrings(cx, sysobj, "_property_desc_list", sys_prop_desc, JSPROP_READONLY);
#endif

	/****************************/
	/* static string properties */
	if((js_str=JS_NewStringCopyZ(cx, host_name))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "host_name", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx, VERSION))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "version", &val))
		return(NULL);

	sprintf(str,"%c",REVISION);
	if((js_str=JS_NewStringCopyZ(cx, str))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "revision", &val))
		return(NULL);

	sprintf(str,"%s%c%s",VERSION,REVISION,beta_version);
	truncsp(str);
#if defined(_DEBUG)
	strcat(str," Debug");
#endif
	if((js_str=JS_NewStringCopyZ(cx, str))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "full_version", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx, VERSION_NOTICE))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "version_notice", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx, PLATFORM_DESC))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "platform", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx, socklib_version(str)))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "socket_lib", &val))
		return(NULL);

	sprintf(str,"SMBLIB %s",smb_lib_ver());
	if((js_str=JS_NewStringCopyZ(cx, str))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "msgbase_lib", &val))
		return(NULL);

	DESCRIBE_COMPILER(str);
	if((js_str=JS_NewStringCopyZ(cx, str))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "compiled_with", &val))
		return(NULL);

	sprintf(str,"%s %.5s",__DATE__,__TIME__);
	if((js_str=JS_NewStringCopyZ(cx, str))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "compiled_when", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx, COPYRIGHT_NOTICE))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "copyright", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx
		,(char *)JS_GetImplementationVersion()))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "js_version", &val))
		return(NULL);

	if((js_str=JS_NewStringCopyZ(cx,os_version(str)))==NULL)
		return(NULL);
	val = STRING_TO_JSVAL(js_str);
	if(!JS_SetProperty(cx, sysobj, "os_version", &val))
		return(NULL);

	/***********************/

	val = INT_TO_JSVAL(uptime);
	if(!JS_SetProperty(cx, sysobj, "uptime", &val))
		return(NULL);

	statsobj = JS_DefineObject(cx, sysobj, "stats", &js_sysstats_class, NULL
		,JSPROP_ENUMERATE|JSPROP_READONLY);

	if(statsobj==NULL)
		return(NULL);

	JS_SetPrivate(cx, statsobj, cfg);	/* Store a pointer to scfg_t */

	if(!JS_DefineProperties(cx, statsobj, js_sysstats_properties))
		return(NULL);

#ifdef _DEBUG
	js_DescribeObject(cx,statsobj,"System statistics");
	js_CreateArrayOfStrings(cx, statsobj, "_property_desc_list", sysstat_prop_desc, JSPROP_READONLY);
#endif

	/* node_list property */

	if((node_list=JS_NewArrayObject(cx, 0, NULL))==NULL) 
		return(NULL);

	for(i=0;i<cfg->sys_nodes && i<cfg->sys_lastnode;i++) {

		nodeobj = JS_NewObject(cx, &js_node_class, NULL, node_list);

		if(nodeobj==NULL)
			return(NULL);

		/* Store node number */
		/* We have to shift it to make it look like a pointer to JS. :-( */
		if(!JS_SetPrivate(cx, nodeobj, (char*)((i+1)<<1)))	
			return(NULL);

		if(!JS_DefineProperties(cx, nodeobj, js_node_properties))
			return(NULL);

#ifdef _DEBUG
		js_DescribeObject(cx,nodeobj,"BBS node listing");
		js_CreateArrayOfStrings(cx, nodeobj, "_property_desc_list", node_prop_desc, JSPROP_READONLY);
#endif

		val=OBJECT_TO_JSVAL(nodeobj);
		if(!JS_SetElement(cx, node_list, i, &val))
			return(NULL);
	}	

	if(!JS_DefineProperty(cx, sysobj, "node_list", OBJECT_TO_JSVAL(node_list)
		, NULL, NULL, JSPROP_ENUMERATE))
		return(NULL);

	return(sysobj);
}

#endif	/* JAVSCRIPT */
