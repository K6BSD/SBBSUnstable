/* wraptest.c */

#include <time.h>	/* ctime */

#include "genwrap.h"
#include "conwrap.h"
#include "dirwrap.h"
#include "filewrap.h"
#include "sockwrap.h"
#include "threadwrap.h"

static void getkey(void);


typedef struct {
	sem_t parent_sem;
	sem_t child_sem;
} thread_data_t;

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

int main()
{
	char	compiler[128];
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
	printf("Platform: %s\n",PLATFORM_DESC);
	printf("Compiler: %s\n",compiler);

	printf("\ngetch() test (ESC to continue)\n");
	do {
		ch=getch();
		printf("getch() returned %d\n",ch);
	} while(ch!=ESC);

#if 1
	/* BEEP test */
	printf("\nBEEP() test\n");
	getkey();
	for(i=750;i>250;i-=5)
		BEEP(i,15);
	for(;i<1000;i+=5)
		BEEP(i,15);

	/* SLEEP test */
	printf("\nSLEEP() test\n");
	getkey();
	t=time(NULL);
	printf("sleeping... ");
	fflush(stdout);
	SLEEP(5000);
	printf("slept %d seconds\n",time(NULL)-t);

	/* glob test */
	printf("\nglob() test\n");
	getkey();
	i=glob(glob_pattern,GLOB_MARK,NULL,&g);
	if(i==0) {
		for(u=0;u<g.gl_pathc;u++)
			printf("%s\n",g.gl_pathv[u]);
		globfree(&g);
	} else
		printf("glob(%s) returned %d\n",glob_pattern,i);

	/* opendir (and other directory functions) test */
	printf("\nopendir() test\n");
	getkey();
	dir=opendir(".");
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
#endif

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
		 )==-1)
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

	return 0;
}

static void getkey(void)
{
	printf("Hit any key...");
	fflush(stdout);
	getch();
	printf("\r%20s\r","");
	fflush(stdout);
}
