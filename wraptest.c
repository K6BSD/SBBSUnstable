/* wraptest.c */

/* Verification of cross-platform development wrappers */

#include <time.h>	/* ctime */

#include "genwrap.h"
#include "conwrap.h"
#include "dirwrap.h"
#include "filewrap.h"
#include "sockwrap.h"
#include "threadwrap.h"

static void getkey(void);
static void thread_test(void* arg);

typedef struct {
	sem_t parent_sem;
	sem_t child_sem;
} thread_data_t;

int main()
{
	char	str[128];
	char	compiler[128];
	char	fullpath[MAX_PATH+1];
	char*	path = ".";
	char*	glob_pattern = "*wrap*";
	int		i;
	int		ch;
	uint	u;
	time_t	t;
	glob_t	g;
	DIR*	dir;
	DIRENT*	dirent;
	thread_data_t thread_data;

	/* Show platform details */
	DESCRIBE_COMPILER(compiler);
	printf("%-15s: %s\n","Platform",PLATFORM_DESC);
	printf("%-15s: %s\n","Version",os_version(str));
	printf("%-15s: %s\n","Compiler"	,compiler);
	printf("%-15s: %d\n","Random Number",xp_random(1000));

	printf("\ngetch() test (ESC to continue)\n");
	do {
		ch=getch();
		printf("getch() returned %d\n",ch);
	} while(ch!=ESC);

	printf("\nkbhit() test (any key to continue)\n");
	while(!kbhit()) {
		printf(".");
		fflush(stdout);
		SLEEP(500);
	}
	getch();	/* remove character from keyboard buffer */

#if 1
	/* BEEP test */
	printf("\nBEEP() test\n");
	getkey();
	for(i=750;i>250;i-=5)
		BEEP(i,15);
	for(;i<1000;i+=5)
		BEEP(i,15);

	/* SLEEP test */
	printf("\nSLEEP(5 second) test\n");
	getkey();
	t=time(NULL);
	printf("sleeping... ");
	fflush(stdout);
	SLEEP(5000);
	printf("slept %d seconds\n",time(NULL)-t);

	/* glob test */
	printf("\nglob(%s) test\n",glob_pattern);
	getkey();
	i=glob(glob_pattern,GLOB_MARK,NULL,&g);
	if(i==0) {
		for(u=0;u<g.gl_pathc;u++)
			printf("%s\n",g.gl_pathv[u]);
		globfree(&g);
	} else
		printf("glob(%s) returned %d\n",glob_pattern,i);

	/* opendir (and other directory functions) test */
	printf("\nopendir(%s) test\n",path);
	getkey();
	printf("\nDirectory of %s\n\n",FULLPATH(fullpath,path,sizeof(fullpath)));
	dir=opendir(path);
	while(dir!=NULL && (dirent=readdir(dir))!=NULL) {
		t=fdate(dirent->d_name);
		printf("%.24s %10lu  %06o  %s%c\n"
			,ctime(&t)
			,flength(dirent->d_name)
			,getfattr(dirent->d_name)
			,dirent->d_name
			,isdir(dirent->d_name) ? '/':0
			);
	}
	if(dir!=NULL)
		closedir(dir);
	printf("\nFree disk space: %lu bytes\n",getfreediskspace(path));
#endif

#if 1
	/* Thread (and inter-process communication) test */
	printf("\nThread test\n");
	getkey();
	sem_init(&thread_data.parent_sem
		,0 /* shared between processes */
		,0 /* initial count */
		);
	sem_init(&thread_data.child_sem
		,0	/* shared between processes */
		,0	/* initial count */
		);
	if(_beginthread(
		  thread_test	/* entry point */
		 ,0				/* stack size (0=auto) */
		 ,&thread_data	/* data */
		 )==(unsigned long)-1)
		printf("_beginthread failed\n");
	else {
		sem_wait(&thread_data.child_sem);	/* wait for thread to begin */
		for(i=0;i<10;i++) {
			printf("<parent>");
			sem_post(&thread_data.parent_sem);
			sem_wait(&thread_data.child_sem);
		}
		sem_wait(&thread_data.child_sem);	/* wait for thread to end */
	}
	sem_destroy(&thread_data.parent_sem);
	sem_destroy(&thread_data.child_sem);
#endif
	return 0;
}

static void getkey(void)
{
	printf("Hit any key to continue...");
	fflush(stdout);
	getch();
	printf("\r%30s\r","");
	fflush(stdout);
}

static void thread_test(void* arg)
{
	ulong i;
	thread_data_t* data = (thread_data_t*)arg;

	printf("thread_test entry\n");
	sem_post(&data->child_sem);

	for(i=0;i<10;i++) {
		sem_wait(&data->parent_sem);
		printf(" <child>\n");
		sem_post(&data->child_sem);
	}

	printf("thread_test exit\n");
	sem_post(&data->child_sem);
}
