/* md5.h - header file for md5.c */

/* $Id$ */

/* RSA Data Security, Inc., MD5 Message-Digest Algorithm */

/* NOTE: Numerous changes have been made; the following notice is
included to satisfy legal requirements.

Copyright (C) 1991-2, RSA Data Security, Inc. Created 1991. All
rights reserved.

License to copy and use this software is granted provided that it
is identified as the "RSA Data Security, Inc. MD5 Message-Digest
Algorithm" in all material mentioning or referencing this software
or this function.

License is also granted to make and use derivative works provided
that such works are identified as "derived from the RSA Data
Security, Inc. MD5 Message-Digest Algorithm" in all material
mentioning or referencing the derived work.

RSA Data Security, Inc. makes no representations concerning either
the merchantability of this software or the suitability of this
software for any particular purpose. It is provided "as is"
without express or implied warranty of any kind.

These notices must be retained in any copies of any part of this
documentation and/or software.
*/

#ifndef H__MD5
#define H__MD5

#include <stddef.h>		/* size_t */

#define MD5_DIGEST_SIZE		16

#ifndef UINT4
	typedef unsigned long UINT4;
#endif
#ifndef BYTE
	typedef unsigned char BYTE;
#endif

typedef struct
{
  UINT4	state[4];
  UINT4	count[2];
  BYTE	buffer[64];
} MD5;

#if defined(DLLEXPORT)
	#undef DLLEXPORT
#endif
#if defined(DLLCALL)
	#undef DLLCALL
#endif

#if defined(_WIN32) && (defined(MD5_IMPORTS) || defined(MD5_EXPORTS))
	#if defined(MD5_IMPORTS)
		#define DLLEXPORT	__declspec(dllimport)
	#else
		#define DLLEXPORT	__declspec(dllexport)
	#endif
	#if defined(__BORLANDC__)
		#define DLLCALL __stdcall
	#else
		#define DLLCALL
	#endif
#else	/* !_WIN32 || !_DLL*/
	#define DLLEXPORT
	#define DLLCALL
#endif


#ifdef __cplusplus
extern "C" {
#endif

DLLEXPORT void	DLLCALL MD5_open(MD5* ctx);
DLLEXPORT void	DLLCALL MD5_digest(MD5* ctx, const void* buf, size_t len);
DLLEXPORT void	DLLCALL MD5_close(MD5* ctx, BYTE digest[MD5_DIGEST_SIZE]);
DLLEXPORT BYTE*	DLLCALL MD5_calc(BYTE digest[MD5_DIGEST_SIZE], const void* buf, size_t len);
DLLEXPORT BYTE*	DLLCALL MD5_hex(BYTE* dest, const BYTE digest[MD5_DIGEST_SIZE]);

#ifdef __cplusplus
}
#endif

#endif
