# משפחת ספיר: כללי R8
# ה-SDK של Google Mobile Ads ו-UMP מביאים כללים משלהם; כאן רק מה שמיוחד לאפליקציה
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers class * extends android.webkit.WebViewClient { public *; }
-keepclassmembers class * extends android.webkit.WebChromeClient { public *; }
# שמירת מספרי שורות לדוחות קריסה
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
