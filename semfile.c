/* semfile.c */

/* $Id$ */

/****************************************************************************
 * @format.tab-size 4		(Plain Text/Source Code File Header)			*
 * @format.use-tabs true	(see http://www.synchro.net/ptsc_hdr.html)		*
 *																			*
 * Copyright 2004 Rob Swindell - http://www.synchro.net/copyright.html		*
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
#include "link_list.h"

/****************************************************************************/
/* This function compares a single semaphore file's							*/
/* date/time stamp (if the file exists) against the passed time stamp (t)	*/
/* updating the time stamp to the latest dated semaphore file and returning	*/
/* TRUE if any where newer than the initial value.							*/
/****************************************************************************/
BOOL DLLCALL semfile_check(time_t* t, const char* fname)
{
	time_t	ft;

	if((ft=fdate(fname))==-1 || ft<=*t)
		return(FALSE);

	*t=ft;
	return(TRUE);
}

/****************************************************************************/
/* This function goes through a list of semaphore files, comparing the file	*/
/* date/time stamp (if the file exists) against the passed time stamp (t)	*/
/* updating the time stamp to the latest dated semaphore file and returning	*/
/* a pointer to the filename if any where newer than the initial timestamp.	*/
/****************************************************************************/
char* DLLCALL semfile_list_check(time_t* t, link_list_t* filelist)
{
	char*	signaled=NULL;
	list_node_t* node;

	for(node=listFirstNode(filelist);node!=NULL;node=listNextNode(node))
		if(semfile_check(t, node->data))
			signaled = node->data;

	return(signaled);
}

void DLLCALL semfile_list_init(link_list_t* filelist, const char* parent, 
							   const char* action, const char* hostname, const char* service)
{
	char path[MAX_PATH+1];

	listInit(filelist,0);
	SAFEPRINTF2(path,"%s%s",parent,action);
	listPushNodeString(filelist,path);
	SAFEPRINTF3(path,"%s%s.%s",parent,action,hostname);
	listPushNodeString(filelist,path);
	SAFEPRINTF3(path,"%s%s.%s",parent,action,service);
	listPushNodeString(filelist,path);
	SAFEPRINTF4(path,"%s%s.%s.%s",parent,action,hostname,service);
	listPushNodeString(filelist,path);
}