#include <genwrap.h>
#include <semwrap.h>

#include "mouse.h"

enum {
	 MOUSE_NOSTATE
	,MOUSE_SINGLEPRESSED
	,MOUSE_CLICKED
	,MOUSE_DOUBLEPRESSED
	,MOUSE_DOUBLECLICKED
	,MOUSE_TRIPLEPRESSED
	,MOUSE_TRIPLECLICKED
	,MOUSE_QUADPRESSED
	,MOUSE_QUADCLICKED
};

static pthread_mutex_t in_mutex;
static pthread_mutex_t out_mutex;
sem_t in_sem;

struct in_mouse_event {
	int	event;
	int	x;
	int	y;
	clock_t	ts;
	void	*nextevent;
};

struct out_mouse_event {
	int event;
	int bstate;
	int kbsm;		/* Known button state mask */
	int startx;
	int starty;
	int endx;
	int endy;
	void *nextevent;
};

struct curr_event {
	int	event;		/* Current event (if successfull)
				 * ie: If you're already clicked, and not moved, a double-click
				 * is the "Current Event" */
	int	sx;		/* Current event start x */
	int	sy;		/* Current event start y */
	clock_t	ts;		/* msclock() time this event will finish
				 * ie: When double-click is current, release+timeout or
				 * press+timeout */
}

struct mouse_state {
	int	buttonstate;			/* Current state of all buttons - bitmap */
	int	knownbuttonstatemask;	/* Mask of buttons that have done something since
								 * We started watching... the rest are actually in
								 * an unknown state */
	int	button_states[3];				/* Expanded state of each button */
	int	button_x[3];					/* Start X/Y position of the current state */
	int	button_y[3];					
	int	curx;					/* Current X position */
	int	cury;					/* Current Y position */
	int	events;					/* Currently enabled events */
	int	click_timeout;			/* Timeout between press and release events for a click (ms) */
	int	multi_timeout;			/* Timeout after a click for detection of multi clicks (ms) */
	int	click_drift;			/* Allowed "drift" during a click event */
	struct in_mouse_event	*events_in;		/* Pointer to recevied events stack */
	struct out_mouse_event	*events_out;	/* Pointer to output events stack */
};

struct mouse_state state;

void init_mouse(void)
{
	state.buttonstate=0;
	state.knownbuttonstatemask=0;
	state.curx=0;
	state.cury=0;
	state.events=0;
	state.click_timeout=200;
	state.multi_timeout=300;
	state.events_in=(struct in_mouse_event *)NULL;
	state.events_out=(struct out_mouse_event *)NULL;
	pthread_mutex_init(&in_mutex,NULL);
	pthread_mutex_init(&out_mutex,NULL);
	sem_init(&in_sem,0,0);
}

int ciomouse_setevents(int events)
{
	state.events=events;
	return state.events;
}

int ciomouse_addevents(int events)
{
	state.events |= events;
	return state.events;
}

int ciomouse_delevents(int events)
{
	state.events &= ~events;
	return state.events;
}

static void ciomouse_gotevent(int event, int x, int y)
{
	struct in_mouse_event *ime;
	struct in_mouse_event **lastevent;

	/* If you're not handling any mouse events, it doesn't matter what happens */
	/* though this COULD be used to build up correct current mouse state data */
	if(!state.events)
		return;

	ime=(struct in_mouse_event *)malloc(sizeof(struct in_mouse_event));
	ime->ts=msclock();
	ime->event=event;
	ime->x=x;
	ime->y=y;
	ime->nextevent=NULL;

	pthread_mutex_lock(&in_mutex);

	for(lastevent=&state.events_in;*lastevent != NULL;lastevnet=&(lastevent->nextevent));
	*lastevent=ime;

	pthread_mutex_unlock(&in_mutex);
	sem_post(&in_sem);
}

static void add_outevent(int event, int bstate, int kbsm, sx, sy, ex, ey)
{
	struct out_mouse_event *ome;
	struct out_mouse_event **lastevent;

	ome=(struct out_mouse_event *)malloc(sizeof(out_mouse_ecent));

	ome->event=event;
	ome->bstate=bstate;
	ome->kbsm=kbsm;
	ome->startx=sx;
	ome->starty=sy;
	ome->endx=ex;
	ome->endy=ey;
	ome->nextevent=(struct out_mouse_event *)NULL;

	pthread_mutex_lock(&out_mutex);

	for(lastevent=&state.events_out;*lastevent != NULL;lastevent=&(lastevent->nextevent));
	*lastevent=ome;

	pthread_mutex_unlock(&in_mutex);
}

static void ciolib_mouse_thread(void *data)
{
	int	use_timeout=0;
	struct timespec timeout;
	init_mouse();
	struct in_mouse_event *old_in_event;

	while(1) {
		if(use_timeout)
			sem_timedwait(&in_sem,&timeout);
		else
			sem_wait(&in_sem);

		/* Check for a timeout rather than a sem_post() */
		
		if(!validate_pending(state.events_in->event)) {
			add_eventsfor(state.events_in->event);
		}
		use_timeout=get_timeout(&timeout);

		pthread_mutex_lock(&in_mutex);
		old_in_event=state.events_in;
		state.events_in=state.events_in->nextevent;
		free(old_in_event);
		pthread_mutes_unlock(&in_mutex);
	}
}
