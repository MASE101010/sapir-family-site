plugins { id("com.android.application") }

val ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
val ksPass = System.getenv("ANDROID_KEYSTORE_PASSWORD")

android {
    namespace = "il.co.sapirfamily.app"
    compileSdk = 36
    defaultConfig {
        applicationId = "il.co.sapirfamily.app"
        minSdk = 24
        targetSdk = 36
        versionCode = (System.getenv("APP_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("APP_VERSION_NAME") ?: "1.0"
    }
    signingConfigs {
        create("release") {
            if (ksPath != null && ksPass != null) {
                storeFile = file(ksPath); storePassword = ksPass; keyAlias = "sapir"; keyPassword = ksPass
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (ksPath != null) signingConfig = signingConfigs.getByName("release")
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.google.android.gms:play-services-ads:24.4.0")
}

configurations.all {
    resolutionStrategy {
        force("org.jetbrains.kotlin:kotlin-stdlib:1.9.24", "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.24", "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.24")
    }
}
