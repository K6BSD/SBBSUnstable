/* sexyz.c */

/* Synchronet External X/Y/ZMODEM Transfer Protocols */

/* $Id$ */

/****************************************************************************
 * @format.tab-size 4		(Plain Text/Source Code File Header)			*
 * @format.use-tabs true	(see http://www.synchro.net/ptsc_hdr.html)		*
 *																			*
 * Copyright 2005 Rob Swindell - http://www.synchro.net/copyright.html		*
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

/* 
 * ZMODEM code based on zmtx/zmrx v1.02 (C) Mattheij Computer Service 1994
 * by Jacques Mattheij <jacquesm@hacktic.nl> 
 */

#include <time.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>
#include <sys/stat.h>

/* xpdev */
#include "conwrap.h"
#include "genwrap.h"
#include "semwrap.h"
#include "dirwrap.h"
#include "filewrap.h"
#include "sockwrap.h"
#include "str_list.h"
#include "ini_file.h"
#include "eventwrap.h"
#include "threadwrap.h"

/* sbbs */
#include "ringbuf.h"
#include "telnet.h"

/* sexyz */
#include "sexyz.h"

#define SINGLE_THREADED		FALSE
#define IO_THREAD_BUF_SIZE	4096

/***************/
/* Global Vars */
/***************/
long	mode=0;							/* Program mode 					*/
long	zmode=0L;						/* Zmodem mode						*/
uchar	block[1024];					/* Block buffer 					*/
ulong	block_num;						/* Block number 					*/
time_t	startall;
char*	dszlog;

xmodem_t xm;
zmodem_t zm;

FILE*	errfp;
FILE*	statfp;
FILE*	logfp=NULL;

char	revision[16];

SOCKET	sock=INVALID_SOCKET;

BOOL	telnet=TRUE;
BOOL	terminate=FALSE;
BOOL	debug_tx=FALSE;
BOOL	debug_rx=FALSE;
BOOL	debug_telnet=FALSE;
BOOL	pause_on_exit=FALSE;
BOOL	newline=TRUE;

time_t		progress_interval;

RingBuf		outbuf;
#if defined(RINGBUF_EVENT)
	#define		outbuf_empty outbuf.empty_event
#else
	xpevent_t	outbuf_empty;
#endif
unsigned	outbuf_drain_timeout;

unsigned	flows=0;
unsigned	select_errors=0;

#define getcom(t)	recv_byte(NULL,t)
#define putcom(ch)	send_byte(NULL,ch,10)

#ifdef _WINSOCKAPI_

WSADATA WSAData;
static BOOL WSAInitialized=FALSE;

static BOOL winsock_startup(void)
{
	int		status;             /* Status Code */

    if((status = WSAStartup(MAKEWORD(1,1), &WSAData))==0) {
		fprintf(statfp,"%s %s\n",WSAData.szDescription, WSAData.szSystemStatus);
		WSAInitialized=TRUE;
		return(TRUE);
	}

    fprintf(errfp,"!WinSock startup ERROR %d\n", status);
	return(FALSE);
}

#else /* No WINSOCK */

#define winsock_startup()	(TRUE)	

#endif


int lputs(void* unused, int level, const char* str)
{
	FILE*	fp=statfp;

    if(level<LOG_NOTICE)
		fp=errfp;

	if(!newline) {
		fprintf(fp,"\n");
		newline=TRUE;
	}
	if(level<LOG_NOTICE)
		return fprintf(fp,"!%s\n",str);
	else
		return fprintf(fp,"%s\n",str);
}

int lprintf(int level, const char *fmt, ...)
{
	char sbuf[1024];
	va_list argptr;

    va_start(argptr,fmt);
    vsnprintf(sbuf,sizeof(sbuf),fmt,argptr);
	sbuf[sizeof(sbuf)-1]=0;
    va_end(argptr);
    return(lputs(NULL,level,sbuf));
}

char *chr(uchar ch)
{
	static char str[25];

	if(mode&ZMODEM) {
		switch(ch) {
			case ZPAD:		return("ZPAD");
			case ZDLE:		return("ZDLE");
			case ZDLEE:		return("ZDLEE");
			case ZBIN:		return("ZBIN");
			case ZHEX:		return("ZHEX");
			case ZBIN32:	return("ZBIN32");
			case ZBINR32:	return("ZBINR32");
			case ZVBIN:		return("ZVBIN");
			case ZVHEX:		return("ZVHEX");
			case ZVBIN32:	return("ZVBIN32");
			case ZVBINR32:	return("ZVBINR32");
			case ZRESC:		return("ZRESC");
		}
	} else {
		switch(ch) {
			case SOH:	return("SOH");
			case STX:	return("STX");
			case ETX:	return("ETX");
			case EOT:	return("EOT");
			case ACK:	return("ACK");
			case NAK:	return("NAK");
			case CAN:	return("CAN");
		}
	}
	if(ch>=' ' && ch<='~')
		sprintf(str,"'%c' (%02Xh)",ch,ch);
	else
		sprintf(str,"%u (%02Xh)",ch,ch);
	return(str); 
}

void send_telnet_cmd(SOCKET sock, uchar cmd, uchar opt)
{
	uchar buf[3];
	
	buf[0]=TELNET_IAC;
	buf[1]=cmd;
	buf[2]=opt;

	if(debug_telnet)
		lprintf(LOG_DEBUG,"Sending telnet command: %s %s"
			,telnet_cmd_desc(buf[1]),telnet_opt_desc(buf[2]));
	if(send(sock,buf,sizeof(buf),0)!=sizeof(buf) && debug_telnet)
		lprintf(LOG_ERR,"FAILED");
}

#define DEBUG_TELNET FALSE

/****************************************************************************/
/* Receive a byte from remote (single-threaded version)						*/
/****************************************************************************/
int recv_byte(void* unused, unsigned timeout)
{
	int			i;
	long		t;
	uchar		ch;
	fd_set		socket_set;
	time_t		end;
	struct timeval	tv;
	static uchar	telnet_cmd;
	static int		telnet_cmdlen;

	end=msclock()+(timeout*MSCLOCKS_PER_SEC);
	while(!terminate) {

		FD_ZERO(&socket_set);
		FD_SET(sock,&socket_set);
		if((t=end-msclock())<0) t=0;
		tv.tv_sec=t/MSCLOCKS_PER_SEC;
		tv.tv_usec=0;

		if((i=select(sock+1,&socket_set,NULL,NULL,&tv))<1) {
			if(i==SOCKET_ERROR)
				lprintf(LOG_ERR,"ERROR %d selecting socket", ERROR_VALUE);
			if(timeout)
				lprintf(LOG_WARNING,"Receive timeout (%u seconds)", timeout);
			return(NOINP);
		}
		
		i=recv(sock,&ch,sizeof(ch),0);

		if(i!=sizeof(ch)) {
			if(i==0)
				lprintf(LOG_WARNING,"Socket Disconnected");
			else
				lprintf(LOG_ERR,"recv error %d (%d)",i,ERROR_VALUE);
			return(-2); 
		}

		if(telnet) {
			if(ch==TELNET_IAC) {
#if DEBUG_TELNET
				lprintf(LOG_DEBUG,"T<%s> ",telnet_cmd_desc(ch));
#endif
				if(telnet_cmdlen==0) {
					telnet_cmdlen=1;
					continue;
				}
				if(telnet_cmdlen==1) {
					telnet_cmdlen=0;
					return(TELNET_IAC);
				}
			}
			if(telnet_cmdlen) {
				telnet_cmdlen++;
#if DEBUG_TELNET
				if(telnet_cmdlen==2)
					lprintf(LOG_DEBUG,"T<%s> ",telnet_cmd_desc(ch));
				else
					lprintf(LOG_DEBUG,"T<%s> ",telnet_opt_desc(ch));
#endif
				if(debug_telnet && telnet_cmdlen==3)
					lprintf(LOG_DEBUG,"Received telnet command: %s %s"
						,telnet_cmd_desc(telnet_cmd),telnet_opt_desc(ch));
				if(telnet_cmdlen==3 && telnet_cmd==TELNET_DO)
					send_telnet_cmd(sock, TELNET_WILL,ch);
	/*
				else if(telnet_cmdlen==3 && telnet_cmd==TELNET_WILL)
					send_telnet_cmd(sock, TELNET_DO,ch);
	*/
				telnet_cmd=ch;
				if((telnet_cmdlen==2 && ch<TELNET_WILL) || telnet_cmdlen>2) {
					telnet_cmdlen=0;
//					break;
				}
				continue;
			}
		}
		if(debug_rx)
			lprintf(LOG_DEBUG,"RX: %s",chr(ch));
		return(ch);
	}

	return(NOINP);
}

#if !SINGLE_THREADED
/*************************/
/* Send a byte to remote */
/*************************/
int send_byte(void* unused, uchar ch, unsigned timeout)
{
	uchar		buf[2] = { TELNET_IAC, TELNET_IAC };
	unsigned	len=1;

	if(telnet && ch==TELNET_IAC)	/* escape IAC char */
		len=2;
	else
		buf[0]=ch;

	if(RingBufFree(&outbuf)<len) {
		fprintf(statfp,"FLOW");
		flows++;
		if(WaitForEvent(outbuf_empty,timeout*1000)!=WAIT_OBJECT_0) {
			fprintf(statfp,"\n!ERROR Waiting for output buffer to flush\n");
			newline=TRUE;
			return(-1);
		}
		fprintf(statfp,"\b\b\b\b    \b\b\b\b");
	}

	RingBufWrite(&outbuf,buf,len);
#if !defined(RINGBUF_EVENT)
	ResetEvent(outbuf_empty);
#endif

	if(debug_tx)
		lprintf(LOG_DEBUG,"TX: %s",chr(ch));
	return(0);
}

#else

/*************************/
/* Send a byte to remote */
/*************************/
int send_byte(void* unused, uchar ch, unsigned timeout)
{
	uchar		buf[2] = { TELNET_IAC, TELNET_IAC };
	int			len=1;
	int			i;
	fd_set		socket_set;
	struct timeval	tv;

	FD_ZERO(&socket_set);
	FD_SET(sock,&socket_set);
	tv.tv_sec=timeout;
	tv.tv_usec=0;

	if(select(sock+1,NULL,&socket_set,NULL,&tv)<1)
		return(ERROR_VALUE);

	if(telnet && ch==TELNET_IAC)	/* escape IAC char */
		len=2;
	else
		buf[0]=ch;

	i=send(sock,buf,len,0);
	
	if(i==len) {
		if(debug_tx)
			lprintf(LOG_DEBUG,"TX: %s",chr(ch));
		return(0);
	}

	return(-1);
}
#endif

void output_thread(void* arg)
{
	char		stats[128];
    BYTE		buf[IO_THREAD_BUF_SIZE];
	int			i;
    ulong		avail;
	ulong		total_sent=0;
	ulong		total_pkts=0;
	ulong		short_sends=0;
    ulong		bufbot=0;
    ulong		buftop=0;
	fd_set		socket_set;
	struct timeval tv;

#if 0 /* def _DEBUG */
	fprintf(statfp,"output thread started\n");
#endif

	while(sock!=INVALID_SOCKET && !terminate) {

		if(bufbot==buftop)
	    	avail=RingBufFull(&outbuf);
		else
        	avail=buftop-bufbot;

		if(!avail) {
#if !defined(RINGBUF_EVENT)
			SetEvent(outbuf_empty);
#endif
			sem_wait(&outbuf.sem);
			if(outbuf.highwater_mark)
				sem_trywait_block(&outbuf.highwater_sem,outbuf_drain_timeout);
			continue; 
		}

		/* Check socket for writability (using select) */
		tv.tv_sec=0;
		tv.tv_usec=1000;

		FD_ZERO(&socket_set);
		FD_SET(sock,&socket_set);

		i=select(sock+1,NULL,&socket_set,NULL,&tv);
		if(i==SOCKET_ERROR) {
			lprintf(LOG_ERR,"ERROR %d selecting socket %u for send"
				,ERROR_VALUE,sock);
			break;
		}
		if(i<1) {
			select_errors++;
			continue;
		}

        if(bufbot==buftop) { // linear buf empty, read from ring buf
            if(avail>sizeof(buf)) {
                lprintf(LOG_ERR,"Insufficient linear output buffer (%lu > %lu)"
					,avail, sizeof(buf));
                avail=sizeof(buf);
            }
            buftop=RingBufRead(&outbuf, buf, avail);
            bufbot=0;
        }
		i=sendsocket(sock, (char*)buf+bufbot, buftop-bufbot);
		if(i==SOCKET_ERROR) {
        	if(ERROR_VALUE == ENOTSOCK)
                lprintf(LOG_ERR,"client socket closed on send");
            else if(ERROR_VALUE==ECONNRESET) 
				lprintf(LOG_ERR,"connection reset by peer on send");
            else if(ERROR_VALUE==ECONNABORTED) 
				lprintf(LOG_ERR,"connection aborted by peer on send");
			else
				lprintf(LOG_ERR,"ERROR %d sending on socket %d"
                	,ERROR_VALUE, sock);
			break;
		}

		if(i!=(int)(buftop-bufbot)) {
			lprintf(LOG_ERR,"Short socket send (%u instead of %u)"
				,i ,buftop-bufbot);
			short_sends++;
		}
		bufbot+=i;
		total_sent+=i;
		total_pkts++;
    }

	if(total_sent)
		sprintf(stats,"(sent %lu bytes in %lu blocks, %lu average, %lu short, %lu errors)"
			,total_sent, total_pkts, total_sent/total_pkts, short_sends, select_errors);
	else
		stats[0]=0;

	lprintf(LOG_DEBUG,"output thread terminated\n%s", stats);
}
/****************************************************************************/
/* Returns the number of blocks required to send len bytes					*/
/****************************************************************************/
unsigned num_blocks(ulong len, unsigned block_size)
{
	ulong blocks;

	blocks=len/block_size;
	if(len%block_size)
		blocks++;
	return(blocks);
}

/************************************************/
/* Dump the current block contents - for debug  */
/************************************************/
void dump_block(long block_size)
{
	long l;

	for(l=0;l<block_size;l++)
		fprintf(statfp,"%02X  ",block[l]);
	fprintf(statfp,"\n");
}

void xmodem_progress(void* unused, unsigned block_num, ulong offset, ulong fsize, time_t start)
{
	unsigned	cps;
	unsigned	total_blocks;
	long		l;
	long		t;
	time_t		now;
	static time_t last_progress;

	now=time(NULL);
	if(now-last_progress>=progress_interval || offset >= fsize || newline) {
		t=now-start;
		if(t<=0)
			t=1;
		if((cps=offset/t)==0)
			cps=1;			/* cps so far */
		l=fsize/cps;		/* total transfer est time */
		l-=t;				/* now, it's est time left */
		if(l<0) l=0;
		if(mode&SEND) {
			total_blocks=num_blocks(fsize,xm.block_size);
			fprintf(statfp,"\rBlock (%lu%s): %lu/%lu  Byte: %lu  "
				"Time: %lu:%02lu/%lu:%02lu  CPS: %u  %lu%% "
				,xm.block_size%1024L ? xm.block_size: xm.block_size/1024L
				,xm.block_size%1024L ? "" : "K"
				,block_num
				,total_blocks
				,offset
				,t/60L
				,t%60L
				,l/60L
				,l%60L
				,cps
				,(long)(((float)offset/(float)fsize)*100.0)
				);
		} else if(mode&YMODEM) {
			fprintf(statfp,"\rBlock (%lu%s): %lu  Byte: %lu  "
				"Time: %lu:%02lu/%lu:%02lu  CPS: %u  %lu%% "
				,xm.block_size%1024L ? xm.block_size: xm.block_size/1024L
				,xm.block_size%1024L ? "" : "K"
				,block_num
				,offset
				,t/60L
				,t%60L
				,l/60L
				,l%60L
				,cps
				,(long)(((float)offset/(float)fsize)*100.0)
				);
		} else { /* XModem receive */
			fprintf(statfp,"\rBlock (%lu%s): %lu  Byte: %lu  "
				"Time: %lu:%02lu  CPS: %u "
				,xm.block_size%1024L ? xm.block_size: xm.block_size/1024L
				,xm.block_size%1024L ? "" : "K"
				,block_num
				,offset
				,t/60L
				,t%60L
				,cps
				);
		}
		newline=FALSE;
		last_progress=now;
	}
}

/* 
 * show the progress of the transfer like this:
 * zmtx: sending file "garbage" 4096 bytes ( 20%)
 */
void zmodem_progress(void* unused, ulong offset, ulong fsize, time_t start)
{
	unsigned	cps;
	long		l;
	long		t;
	time_t		now;
	static time_t last_progress;

	now=time(NULL);
	if(now-last_progress>=progress_interval || offset >= fsize || newline) {
		t=now-start;
		if(t<=0)
			t=1;
		if((cps=offset/t)==0)
			cps=1;		/* cps so far */
		l=fsize/cps;	/* total transfer est time */
		l-=t;			/* now, it's est time left */
		if(l<0) l=0;
		fprintf(statfp,"\rKByte: %lu/%lu  "
			"Time: %lu:%02lu/%lu:%02lu  CPS: %u  %lu%% "
			,offset/1024
			,fsize/1024
			,t/60L
			,t%60L
			,l/60L
			,l%60L
			,cps
			,(long)(((float)offset/(float)fsize)*100.0)
			);
		newline=FALSE;
		last_progress=now;
	}
}

int send_files(char** fname, uint fnames)
{
	char	path[MAX_PATH+1];
	int		i;
	uint	errors;
	uint	fnum;
	uint	cps;
	glob_t	g;
	int		gi;
	BOOL	success=TRUE;
	long	l;
	long	fsize;
	long	block_len;
	uint	total_files=0,sent_files=0;
	ulong	total_bytes=0,sent_bytes=0;
	ulong	total_blocks;
	size_t	n;
	time_t	t,startfile;
	time_t	now;
	FILE*	fp;

	/****************************************************/
	/* Search through all to find total files and bytes */
	/****************************************************/
	for(fnum=0;fnum<fnames;fnum++) {
		if(glob(fname[fnum],0,NULL,&g)) {
			lprintf(LOG_WARNING,"%s not found",fname[fnum]);
			continue;
		}
		for(i=0;i<(int)g.gl_pathc;i++) {
			if(isdir(g.gl_pathv[i]))
				continue;
			total_files++;
			total_bytes+=flength(g.gl_pathv[i]);
		} 
		globfree(&g);
	}

	if(fnames>1)
		lprintf(LOG_INFO,"Sending %u files (%lu KB total)"
			,total_files,total_bytes/1024);

	zm.n_files_remaining = total_files;
	zm.n_bytes_remaining = total_bytes;

	/***********************************************/
	/* Send every file matching names or filespecs */
	/***********************************************/
	for(fnum=0;fnum<fnames;fnum++) {
		if(glob(fname[fnum],0,NULL,&g)) {
			lprintf(LOG_WARNING,"%s not found",fname[fnum]);
			continue;
		}
		for(gi=0;gi<(int)g.gl_pathc;gi++) {
			SAFECOPY(path,g.gl_pathv[gi]);
			if(isdir(path))
				continue;

			if((fp=fopen(path,"rb"))==NULL) {
				lprintf(LOG_ERR,"Error %d opening %s for read",errno,path);
				continue;
			}

			fsize=filelength(fileno(fp));

			errors=0;
			success=FALSE;
			startfile=time(NULL);

			do { /* try */

				if(!(mode&ZMODEM)) { /* X/Ymodem */
					if(!xmodem_get_mode(&xm)) {
						xmodem_cancel(&xm);
						break;
					}
				}

				lprintf(LOG_INFO,"Sending %s (%lu KB) via %s"
					,path,fsize/1024
					,mode&XMODEM ? "Xmodem" : mode&YMODEM ? mode&GMODE ? "Ymodem-G"
						: "Ymodem" : "Zmodem");

				if(mode&ZMODEM) {

					success=zmodem_send_file(&zm,getfname(path),fp,fnum==0);

				} else {	/* X/Ymodem */

					if(!(mode&XMODEM)) {
						t=fdate(path);
						memset(block,0,sizeof(block));
						SAFECOPY(block,getfname(path));
						i=sprintf(block+strlen(block)+1,"%lu %lo 0 0 %d %ld"
							,fsize,t,total_files-sent_files,total_bytes-sent_bytes);
						
						lprintf(LOG_INFO,"Sending Ymodem header block: '%s'",block+strlen(block)+1);
						
						block_len=strlen(block)+1+i;
						for(errors=0;errors<xm.max_errors;errors++) {
							xmodem_put_block(&xm, block, block_len <=128 ? 128:1024, 0  /* block_num */);
							if(xmodem_get_ack(&xm,1,0))
								break; 
						}
						if(errors==xm.max_errors) {
							lprintf(LOG_ERR,"Failed to send header block");
							xmodem_cancel(&xm);
							break; 
						}
						if(!xmodem_get_mode(&xm)) {
							xmodem_cancel(&xm);
							break;
						}
					}
					startfile=time(NULL);	/* reset time, don't count header block */
					block_num=1;
					errors=0;
					while((block_num-1)*xm.block_size<(ulong)fsize && errors<xm.max_errors) {
						fseek(fp,(block_num-1)*(long)xm.block_size,SEEK_SET);
						memset(block,CPMEOF,xm.block_size);
						if((n=fread(block,1,xm.block_size,fp))!=xm.block_size
							&& block_num*xm.block_size<(ulong)fsize) {
							lprintf(LOG_ERR,"READ ERROR %d instead of %d at offset %lu"
								,n,xm.block_size,(block_num-1)*(long)xm.block_size);
							errors++;
							continue;
						}
						xmodem_progress(xm.cbdata,block_num,ftell(fp),fsize,startfile);
						xmodem_put_block(&xm, block, xm.block_size, block_num);
						now=time(NULL);
						total_blocks=num_blocks(fsize,xm.block_size);
						if(!xmodem_get_ack(&xm,5,block_num)) {
							errors++;
							lprintf(LOG_WARNING,"Error #%d at offset %ld"
								,errors,ftell(fp)-xm.block_size);
						} else
							block_num++; 
					}
					if((long)(block_num-1)*(long)xm.block_size>=fsize) {

#if !SINGLE_THREADED
						lprintf(LOG_DEBUG,"Waiting for output buffer to empty... ");
						if(WaitForEvent(outbuf_empty,5000)!=WAIT_OBJECT_0)
							lprintf(LOG_WARNING,"FAILURE");
#endif
						success=xmodem_put_eot(&xm);	/* end-of-text, wait for ACK */
					}
				}
			} while(0);
			/* finally */
			fclose(fp);

			if((t=time(NULL)-startfile)<=0) 
				t=1;
			cps=fsize/t;
			if(success) {
				sent_files++;
				sent_bytes+=fsize;
				lprintf(LOG_INFO,"Successful - Time: %lu:%02lu  CPS: %lu"
						,t/60,t%60,cps);
			} else
				lprintf(LOG_WARNING,"File Transfer Failure");

			if(total_files>1)
				lprintf(LOG_INFO,"Remaining - Time: %lu:%02lu  Files: %u  KBytes: %lu"
					,((total_bytes-sent_bytes)/cps)/60
					,((total_bytes-sent_bytes)/cps)%60
					,total_files-sent_files
					,(total_bytes-sent_bytes)/1024
					);

			/* DSZLOG entry */
			if(logfp) {
				lprintf(LOG_DEBUG,"Updating DSZLOG: %s", dszlog);
				if(mode&ZMODEM)
					l=zm.sent_successfully;
				else {
					l=(block_num-1)*(long)xm.block_size;
					if(l>fsize)
						l=fsize;
				}
				fprintf(logfp,"%c %7lu %5u bps %6lu cps %3u errors %5u %4u "
					"%s -1\n"
					,success ? (mode&ZMODEM ? 'z':'S') 
						: (mode&ZMODEM && zm.file_skipped) ? 's' 
						: 'E'
					,l
					,115200 /* baud */
					,l/t
					,errors
					,flows
					,xm.block_size
					,path); 
			}
		} /* while(gi<(int)g.gl_pathc) */

		if(gi<(int)g.gl_pathc)/* error occurred */
			break;
	}
	if(fnum<fnames) /* error occurred */
		return(-1);

	if(!success)
		return(-1);

	if(mode&XMODEM)
		return(0);
	if(mode&ZMODEM)
		zmodem_send_zfin(&zm);
	else {	/* YMODEM */

		if(xmodem_get_mode(&xm)) {

			lprintf(LOG_INFO,"Sending Ymodem termination block");

			memset(block,0,128);	/* send short block for terminator */
			xmodem_put_block(&xm, block, 128 /* block_size */, 0 /* block_num */);
			if(!xmodem_get_ack(&xm,6,0)) {
				lprintf(LOG_WARNING,"Failed to receive ACK after terminating block"); 
			} 
		}
	}
	if(total_files>1) {
		t=time(NULL)-startall;
		if(!t) t=1;
		lprintf(LOG_INFO,"Overall - Time %02lu:%02lu  KBytes: %lu  CPS: %lu"
			,t/60,t%60,sent_bytes/1024,sent_bytes/t); 
	}
	return(0);	/* success */
}

int receive_files(char** fname, int fnames)
{
	char	str[MAX_PATH+1];
	int		i;
	int		fnum=0;
	uint	errors;
	uint	total_files=0;
	uint	cps;
	uint	wr;
	BOOL	success=FALSE;
	BOOL	cancelled=FALSE;
	long	fmode;
	long	serial_num=-1;
	ulong	file_bytes=0,file_bytes_left=0;
	ulong	total_bytes=0;
	FILE*	fp;
	time_t	t,startfile,ftime;

	if(fnames>1)
		lprintf(LOG_INFO,"Receiving %u files",fnames);

	outbuf.highwater_mark=0;	/* don't delay ACK/NAK transmits */

	while(!terminate && !cancelled) {
		if(mode&XMODEM) {
			SAFECOPY(str,fname[0]);
			file_bytes=file_bytes_left=0x7fffffff;
		}

		else if(mode&YMODEM) {
			lprintf(LOG_INFO,"Fetching Ymodem header block");
			for(errors=0;errors<xm.max_errors;errors++) {
				if(errors>(xm.max_errors/2) && mode&CRC && !(mode&GMODE))
					mode&=~CRC;
				xmodem_put_nak(&xm, /* expected_block: */ 0);
				if(xmodem_get_block(&xm, block, /* expected_block: */ 0) == 0) {
					putcom(ACK);
					break; 
				} 
			}
			if(errors==xm.max_errors) {
				lprintf(LOG_ERR,"Error fetching Ymodem header block");
				xmodem_cancel(&xm);
				return(1); 
			}
			if(!block[0]) {
				lprintf(LOG_INFO,"Received Ymodem termination block");
				return(0); 
			}
			i=sscanf(block+strlen(block)+1,"%ld %lo %lo %lo %d %ld"
				,&file_bytes			/* file size (decimal) */
				,&ftime 				/* file time (octal unix format) */
				,&fmode 				/* file mode (not used) */
				,&serial_num			/* program serial number */
				,&total_files			/* remaining files to be sent */
				,&total_bytes			/* remaining bytes to be sent */
				);
			lprintf(LOG_DEBUG,"Ymodem header (%u fields): %s", i, block+strlen(block)+1);
			if(!file_bytes)
				file_bytes=0x7fffffff;
			file_bytes_left=file_bytes;
			if(!total_files)
				total_files=fnames-fnum;
			if(!total_files)
				total_files=1;
			if(total_bytes<file_bytes)
				total_bytes=file_bytes;
			if(!serial_num)
				serial_num=-1;
			fprintf(statfp,"Incoming filename: %.64s ",block);
			if(mode&DIR)
				sprintf(str,"%s%s",fname[0],getfname(block));
			else {
				SAFECOPY(str,getfname(block));
				for(i=0;i<fnames;i++) {
					if(!fname[i][0])	/* name blank or already used */
						continue;
					if(!stricmp(getfname(fname[i]),str)) {
						SAFECOPY(str,fname[i]);
						fname[i][0]=0;
						break; 
					} 
				}
				if(i==fnames) { 				/* Not found in list */
					if(fnames)
						fprintf(statfp," - Not in receive list!");
					if(!fnames || fnum>=fnames || !fname[fnum][0])
						SAFECOPY(str,getfname(block));	/* worst case */
					else {
						SAFECOPY(str,fname[fnum]);
						fname[fnum][0]=0; 
					} 
				} 
			}
			fprintf(statfp,"\n"); 
			fprintf(statfp,"File size: %lu bytes\n", file_bytes);
			fprintf(statfp,"Remaining: %lu bytes in %u files\n", total_bytes, total_files);
//			getchar();
		}

		else {	/* Zmodem */
#if 0
			tryzhdrtype=ZRINIT;
			while(1) {
				Txhdr[ZF0]=(CANFC32|CANFDX|CANOVIO|CANRLE);
				/* add CANBRK if we can send break signal */
				if(zmode&CTRL_ESC)
					Txhdr[ZF0]|=TESCCTL;
				Txhdr[ZF1]=CANVHDR;
				Txhdr[ZP0]=0;
				Txhdr[ZP1]=0;
				putzhhdr(tryzhdrtype);
				done=0;
				while(!done) {
					done=1;
					switch(getzhdr()) {
						case ZRQINIT:
							if(Rxhdr[ZF3]&0x80)
								zmode|=VAR_HDRS;   /* we can var header */
							break;
						case ZFILE:
							zconv=Rxhdr[ZF0];
							zmanag=Rxhdr[ZF1];
							ztrans=Rxhdr[ZF2];
							if(Rxhdr[ZF3]&ZCANVHDR)
								zmode|=VAR_HDRS;
							tryzhdrtype=ZRINIT;
							if(getzdata(block, 1024)==GOTCRCW) {
								/* something */
								done=1; 
							}
							putzhhdr(ZNAK);
							done=0;
							break;
						case ZSINIT:
							if(Rxhdr[ZF0]&TESCCTL)
								zmode|=CTRL_ESC;
							if (getzdata(attn,ZATTNLEN)==GOTCRCW) {
								ltohdr(1L);
								putzhhdr(ZACK); 
							}
							else
								putzhhdr(ZNAK);
							done=0;
							break;
						case ZFREECNT:
							ltohdr(0);			/* should be free disk space */
							putzhhdr(ZACK);
							done=0;
							break;
						case ZCOMMAND:
/***
							cmdzack1flg = Rxhdr[ZF0];
							if(getzdata(block,1024)==GOTCRCW) {
								if (cmdzack1flg & ZCACK1)
									ltohdr(0L);
								else
									ltohdr((long)sys2(block));
								purgeline();	/* dump impatient questions */
								do {
									zshhdr(4,ZCOMPL, Txhdr);
								}
								while (++errors<20 && zgethdr(Rxhdr,1)!=ZFIN);
								ackbibi();
								if (cmdzack1flg & ZCACK1)
									exec2(block);
								return ZCOMPL;
							}
***/
							putzhhdr(ZNAK);
							done=0;
							break;
						case ZCOMPL:
							done=0;
							break;
						case ZFIN:
							ackbibi();
							return ZCOMPL;
						case ZCAN:
							return ERROR; 
				} 
			}
#endif
		}

		fnum++;

		if(!(mode&DIR) && fnames && fnum>fnames) {
			lprintf(LOG_WARNING,"Attempt to send more files than specified");
			xmodem_cancel(&xm);
			break; 
		}

		if(fexist(str) && !(mode&OVERWRITE)) {
			lprintf(LOG_WARNING,"%s already exists",str);
			xmodem_cancel(&xm);
			return(1); 
		}
		if((fp=fopen(str,"wb"))==NULL) {
			lprintf(LOG_ERR,"Error creating %s",str);
			xmodem_cancel(&xm);
			return(1); 
		}
		setvbuf(fp,NULL,_IOFBF,8*1024);
		startfile=time(NULL);
		if(mode&XMODEM)
			lprintf(LOG_INFO,"Receiving %s via Xmodem %s"
				,str
				,mode&CRC ? "CRC-16":"Checksum");
		else
			lprintf(LOG_INFO,"Receiving %s (%lu KB) via %s %s"
				,str
				,file_bytes/1024
				,mode&YMODEM ? mode&GMODE ? "Ymodem-G" : "Ymodem" :"Zmodem"
				,mode&CRC ? "CRC-16" : "Checksum");

		errors=0;
		block_num=1;
		success=FALSE;
		xmodem_put_nak(&xm, block_num);
		while(1) {
			xmodem_progress(NULL,block_num,ftell(fp),file_bytes,startfile);
			i=xmodem_get_block(&xm, block, block_num); 	

			if(i!=0) {
				if(i==EOT)	{		/* end of transfer */
					success=TRUE;
					xmodem_put_ack(&xm);
					break;
				}
				if(i==CAN) {		/* Cancel */
					cancelled=TRUE;
					break;
				}

				if(mode&GMODE)
					return(-1);

				if(++errors>=xm.max_errors) {
					lprintf(LOG_ERR,"Too many errors (%u)",errors);
					xmodem_cancel(&xm);
					break;
				}
				if(block_num==1 && errors>(xm.max_errors/2) && mode&CRC && !(mode&GMODE))
					mode&=~CRC;
				xmodem_put_nak(&xm, block_num);
				continue;
			}
			if(!(mode&GMODE))
				putcom(ACK);
			if(file_bytes_left<=0L)  { /* No more bytes to send */
				lprintf(LOG_WARNING,"Attempt to send more byte specified in header");
				break; 
			}
			wr=xm.block_size;
			if(wr>file_bytes_left)
				wr=file_bytes_left;
			if(fwrite(block,1,wr,fp)!=wr) {
				lprintf(LOG_ERR,"Error writing %u bytes to file at offset %lu"
					,wr,ftell(fp));
				xmodem_cancel(&xm);
				return(1); 
			}
			file_bytes_left-=wr; 
			block_num++;
		}

		/* Use correct file size */
		fflush(fp);
		if(file_bytes < (ulong)filelength(fileno(fp))) {
			lprintf(LOG_INFO,"Truncating file to %lu bytes", file_bytes);
			chsize(fileno(fp),file_bytes);
		} else
			file_bytes = filelength(fileno(fp));
		fclose(fp);
		
		t=time(NULL)-startfile;
		if(!t) t=1;
		if(success)
			lprintf(LOG_INFO,"Successful - Time: %lu:%02lu  CPS: %lu"
				,t/60,t%60,file_bytes/t);	
		else
			lprintf(LOG_ERR,"File Transfer Failure");

		if(!(mode&XMODEM) && ftime)
			setfdate(str,ftime); 

		if(logfp) {
			lprintf(LOG_DEBUG,"Updating DSZLOG: %s", dszlog);
			fprintf(logfp,"%c %6lu %5u bps %4lu cps %3u errors %5u %4u "
				"%s %d\n"
				,success ? (mode&ZMODEM ? 'Z' : 'R') : 'E'
				,file_bytes
				,115200	/* baud */
				,file_bytes/t
				,errors
				,flows
				,xm.block_size
				,str
				,serial_num); 
		}
		if(mode&XMODEM)
			break;
		if((cps=file_bytes/t)==0)
			cps=1;
		total_files--;
		total_bytes-=file_bytes;
		if(total_files>1 && total_bytes)
			lprintf(LOG_INFO,"Remaining - Time: %lu:%02lu  Files: %u  KBytes: %lu"
				,(total_bytes/cps)/60
				,(total_bytes/cps)%60
				,total_files
				,total_bytes/1024
				);
	}
	return(!success);	/* 0=success */
}

void exiting(void)
{
	if(pause_on_exit) {
		printf("Hit enter to continue...");
		getchar();
	}
}

static const char* usage=
	"usage: sexyz <socket> [-opts] <cmd> [file | path | +list]\n"
	"\n"
	"socket = TCP socket descriptor\n"
	"\n"
	"opts   = -o  to overwrite files when receiving\n"
	"         -a  to sound alarm at start and stop of transfer\n"
	"         -!  to pause after abnormal exit (error)\n"
	"         -telnet to enable Telnet mode\n"
	"         -rlogin to enable RLogin (pass-through) mode\n"
	"\n"
	"cmd    = v  to display detailed version information\n"
	"         sx to send Xmodem     rx to recv Xmodem\n"
	"         sX to send Xmodem-1K  rc to recv Xmodem-CRC\n"
	"         sy to send Ymodem     ry to recv Ymodem\n"
	"         sY to send Ymodem-1K  rg to recv Ymodem-G\n"
	"         sz to send Zmodem     rz to recv Zmodem\n"
	"\n"
	"file   = filename to send or receive\n"
	"path   = directory to receive files into\n"
	"list   = name of text file with list of filenames to send or receive\n";

/***************/
/* Entry Point */
/***************/
int main(int argc, char **argv)
{
	char	str[MAX_PATH+1];
	char	fname[MAX_PATH+1];
	char	ini_fname[MAX_PATH+1];
	char*	p;
	int 	i;
	int		retval;
	uint	fnames=0;
	FILE*	fp;
	BOOL	tcp_nodelay;
	BOOL	pause_on_abend=FALSE;
	char	compiler[32];
	str_list_t fname_list;

	fname_list=strListInit();

	DESCRIBE_COMPILER(compiler);

	errfp=stderr;
	statfp=stdout;

	sscanf("$Revision$", "%*s %s", revision);

	fprintf(statfp,"\nSynchronet External X/Y/Zmodem  v%s-%s"
		"  Copyright 2005 Rob Swindell\n\n"
		,revision
		,PLATFORM_DESC
		);

	RingBufInit(&outbuf, IO_THREAD_BUF_SIZE);

	xmodem_init(&xm,NULL,&mode,lputs,xmodem_progress,send_byte,recv_byte);
	zmodem_init(&zm,NULL,&mode,lputs,zmodem_progress,send_byte,recv_byte);

	/* Generate path/sexyz[.host].ini from path/sexyz[.exe] */
	SAFECOPY(str,argv[0]);
	p=getfname(str);
	SAFECOPY(fname,p);
	*p=0;
	if((p=getfext(fname))!=NULL) 
		*p=0;
	strcat(fname,".ini");
	
	iniFileName(ini_fname,sizeof(ini_fname),str,fname);
	if((fp=fopen(ini_fname,"r"))!=NULL)
		fprintf(statfp,"Reading %s\n",ini_fname);

	tcp_nodelay				=iniReadBool(fp,ROOT_SECTION,"TCP_NODELAY",TRUE);

	debug_tx				=iniReadBool(fp,ROOT_SECTION,"DebugTx",FALSE);
	debug_rx				=iniReadBool(fp,ROOT_SECTION,"DebugRx",FALSE);
	debug_telnet			=iniReadBool(fp,ROOT_SECTION,"DebugTelnet",FALSE);

	pause_on_exit			=iniReadBool(fp,ROOT_SECTION,"PauseOnExit",FALSE);
	pause_on_abend			=iniReadBool(fp,ROOT_SECTION,"PauseOnAbend",FALSE);

	outbuf.highwater_mark	=iniReadInteger(fp,ROOT_SECTION,"OutbufHighwaterMark",1100);
	outbuf_drain_timeout	=iniReadInteger(fp,ROOT_SECTION,"OutbufDrainTimeout",10);

	progress_interval		=iniReadInteger(fp,ROOT_SECTION,"ProgressInterval",1);

	xm.send_timeout			=iniReadInteger(fp,"Xmodem","SendTimeout",xm.send_timeout);	/* seconds */
	xm.recv_timeout			=iniReadInteger(fp,"Xmodem","RecvTimeout",xm.recv_timeout);	/* seconds */
	xm.byte_timeout			=iniReadInteger(fp,"Xmodem","ByteTimeout",xm.byte_timeout);	/* seconds */
	xm.ack_timeout			=iniReadInteger(fp,"Xmodem","AckTimeout",xm.ack_timeout);	/* seconds */
	xm.block_size			=iniReadInteger(fp,"Xmodem","BlockSize",xm.block_size);		/* 128 or 1024 */
	xm.max_errors			=iniReadInteger(fp,"Xmodem","MaxErrors",xm.max_errors);
	xm.g_delay				=iniReadInteger(fp,"Xmodem","G_Delay",xm.g_delay);

	zm.send_timeout			=iniReadInteger(fp,"Zmodem","SendTimeout",zm.send_timeout);	/* seconds */
	zm.recv_timeout			=iniReadInteger(fp,"Zmodem","RecvTimeout",zm.recv_timeout);	/* seconds */
	zm.max_errors			=iniReadInteger(fp,"Zmodem","MaxErrors",zm.max_errors);

	if(fp!=NULL)
		fclose(fp);

	atexit(exiting);

#if !defined(RINGBUF_EVENT)
	outbuf_empty=CreateEvent(NULL,/* ManualReset */TRUE, /*InitialState */TRUE,NULL);
#endif

#if 0
	if(argc>1) {
		fprintf(statfp,"Command line: ");
		for(i=1;i<argc;i++)
			fprintf(statfp,"%s ",argv[i]);
		fprintf(statfp,"\n",statfp);
	}
#endif


	for(i=1;i<argc;i++) {

		if(sock==INVALID_SOCKET && isdigit(argv[i][0])) {
			sock=atoi(argv[i]);
			continue;
		}

		if(!(mode&(SEND|RECV))) {
			if(toupper(argv[i][0])=='S' || toupper(argv[i][0])=='R') { /* cmd */
				if(toupper(argv[i][0])=='R')
					mode|=RECV;
				else
					mode|=SEND;

				switch(argv[i][1]) {
					case 'c':
					case 'C':
						mode|=XMODEM|CRC;
						break;
					case 'x':
						xm.block_size=128;
					case 'X':
						mode|=XMODEM;
						break;
					case 'b':	/* sz/rz compatible */
					case 'B':
					case 'y':
						xm.block_size=128;
					case 'Y':
						mode|=(YMODEM|CRC);
						break;
					case 'g':
					case 'G':
						mode|=(YMODEM|CRC|GMODE);
						break;
					case 'z':
					case 'Z':
						mode|=(ZMODEM|CRC);
						break;
					default:
						fprintf(statfp,"Unrecognized command '%s'\n\n",argv[i]);
						fprintf(statfp,usage);
						exit(1); 
				} 
				continue;
			}

			if(toupper(argv[i][0])=='V') {

				fprintf(statfp,"%-8s %s\n",getfname(__FILE__)		,revision);
				fprintf(statfp,"%-8s %s\n",getfname(xmodem_source()),xmodem_ver(str));
				fprintf(statfp,"%-8s %s\n",getfname(zmodem_source()),zmodem_ver(str));
#ifdef _DEBUG
				fprintf(statfp,"Debug\n");
#endif
				fprintf(statfp,"Compiled %s %.5s with %s\n",__DATE__,__TIME__,compiler);
				fprintf(statfp,"%s\n",os_version(str));
				exit(1);
			}


			if(argv[i][0]=='-') {
				if(stricmp(argv[i]+1,"telnet")==0) {
					telnet=TRUE;
					continue;
				}
				if(stricmp(argv[i]+1,"rlogin")==0) {
					telnet=FALSE;
					continue;
				}
				switch(toupper(argv[i][1])) {
					case 'K':	/* sz/rz compatible */
						xm.block_size=1024;
						break;
					case 'G':	/* Ymodem-G */
						mode|=GMODE;
						break;
					case 'O':
						mode|=OVERWRITE;
						break;
					case 'A':
						mode|=ALARM;
						break;
					case '!':
						pause_on_abend=TRUE;
						break;
					case 'D':
						mode|=DEBUG; 
						break;
				}
			}
		}

		else if(argv[i][0]=='+') {
			if(mode&DIR) {
				fprintf(statfp,"!Cannot specify both directory and filename\n");
				exit(1); 
			}
			sprintf(str,"%s",argv[i]+1);
			if((fp=fopen(str,"r"))==NULL) {
				fprintf(statfp,"!Error %d opening filelist: %s\n",errno,str);
				exit(1); 
			}
			while(!feof(fp) && !ferror(fp)) {
				if(!fgets(str,sizeof(str),fp))
					break;
				truncsp(str);
				strListAppend(&fname_list,strdup(str),fnames++);
			}
			fclose(fp); 
		}

		else if(mode&(SEND|RECV)){
			if(isdir(argv[i])) { /* is a directory */
				if(mode&DIR) {
					fprintf(statfp,"!Only one directory can be specified\n");
					exit(1); 
				}
				if(fnames) {
					fprintf(statfp,"!Cannot specify both directory and filename\n");
					exit(1); 
				}
				if(mode&SEND) {
					fprintf(statfp,"!Cannot send directory '%s'\n",argv[i]);
					exit(1);
				}
				mode|=DIR; 
			}
			strListAppend(&fname_list,argv[i],fnames++);
		} 
	}

	if(sock==INVALID_SOCKET || sock<1) {
		fprintf(statfp,"!No socket descriptor specified\n\n");
		fprintf(errfp,usage);
		exit(1);
	}

	if(!(mode&(SEND|RECV))) {
		fprintf(statfp,"!No command specified\n\n");
		fprintf(statfp,usage);
		exit(1); 
	}

	if(mode&(SEND|XMODEM) && !fnames) { /* Sending with any or recv w/Xmodem */
		fprintf(statfp,"!Must specify filename or filelist\n\n");
		fprintf(statfp,usage);
		exit(1); 
	}


//	if(mode&DIR)
//		backslash(fname[0]);

	if(mode&ALARM) {
		BEEP(1000,500);
		BEEP(2000,500);
	}

	if(!winsock_startup())
		return(-1);

	/* Enable the Nagle Algorithm */
	lprintf(LOG_DEBUG,"Setting TCP_NODELAY to %d",tcp_nodelay);
	setsockopt(sock,IPPROTO_TCP,TCP_NODELAY,(char*)&tcp_nodelay,sizeof(tcp_nodelay));

	if(!socket_check(sock, NULL, NULL, 0)) {
		fprintf(statfp,"!No socket connection\n");
		return(-1); 
	}

	if((dszlog=getenv("DSZLOG"))!=NULL) {
		if((logfp=fopen(dszlog,"w"))==NULL) {
			fprintf(statfp,"!Error opening DSZLOG file: %s\n",dszlog);
			return(-1); 
		}
	}

	startall=time(NULL);

#if !SINGLE_THREADED
	_beginthread(output_thread,0,NULL);
#endif

	if(mode&RECV)
		retval=receive_files(fname_list, fnames);
	else
		retval=send_files(fname_list, fnames);

#if !SINGLE_THREADED
	lprintf(LOG_DEBUG,"Waiting for output buffer to empty... ");
	if(WaitForEvent(outbuf_empty,5000)!=WAIT_OBJECT_0)
		lprintf(LOG_DEBUG,"FAILURE\n");
#endif

	terminate=TRUE;	/* stop output thread */
//	sem_post(outbuf.sem);
//	sem_post(outbuf.highwater_sem);

	if(mode&ALARM) {
		BEEP(2000,500);
		BEEP(1000,500);
	}
	fprintf(statfp,"Exiting - Error level: %d, flows: %u, select_errors=%u"
		,retval, flows, select_errors);
	fprintf(statfp,"\n");

	if(logfp!=NULL)
		fclose(logfp);

	if(retval && pause_on_abend) {
		printf("Hit enter to continue...");
		getchar();
		pause_on_exit=FALSE;
	}

	return(retval);
}

