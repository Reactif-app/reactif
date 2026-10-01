import { sessionStore } from "@/store/sessionStore";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function About() {
  const [theme, setTheme] = useState(sessionStore.theme);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setTheme(sessionStore.theme);
    });
    return () => unsubscribe();
  }, []);

  const isDark = theme === "dark";

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: isDark ? "#111827" : "#F0F4F8" },
      ]}
    >
      <Stack.Screen
        options={{ title: "À Propos", headerBackTitle: "Retour" }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, justifyContent:"flex-end" }}>
          <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
          >
            <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#fff" : "#000"}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? "#e2e8f0" : "#0A3D62" }]}>
            À propos de cette application
          </Text>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: isDark ? "#1f2937" : "#FFFFFF" },
          ]}
        >
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            Cette application est une assistance à la réanimation
            cardio-pulmonaire (RCP) de type &#34;time keeper&#34;.
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            La gestion automatisée des délais lors d&#39;une RCP limite les
            erreurs tout en améliorant la sécurité et la qualité des soins
            conformément aux dernières recommandations (L’European Resuscitation Council ERC et l’International Liaison Committee on Resuscitation ILCOR 2025).
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            Cette application répond au double objectif d&#39;améliorer les
            séquences de RCP et donc d&#39;améliorer le pronostic des arrêts
            cardiaques (AC), mais aussi d&#39;enregistrer des horaires précis afin d’améliorer la saisie des données dans les registres à des fins d’analyse.
          </Text>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: isDark ? "#1f2937" : "#FFFFFF" },
          ]}
        >
          <Text
            style={[
              styles.subHeader,
              { color: isDark ? "#93c5fd" : "#1F3A93" },
            ]}
          >
            Protection des données :
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            Conformément à la réglementation sur les données de santé,
            l&#39;application se limite à la saisie des horaires des étapes de
            la RCP à des fins d&#39;évaluation des pratiques, excluant toute
            saisie de données personnelles concernant les patients. Aucune
            donnée n&#39;est transmise en dehors de l&#39;appareil sans une
            action explicite de l&#39;utilisateur (ex: export PDF).
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
            >
            L’application ne demande aucune donnée personnelle (nom, prénom, mail) ni aucune autorisation particulière de l’utilisateur (accès aux fichiers, caméra ou géolocalisation...) et n’est donc pas soumise au règlement général sur la protection des données (RGPD).
          </Text>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: isDark ? "#1f2937" : "#FFFFFF" },
          ]}
        >
          <Text
            style={[
              styles.subHeader,
              { color: isDark ? "#93c5fd" : "#1F3A93" },
            ]}
          >
            Conception :
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            Création : Steven LAGADEC (SAMU 91).
          </Text>
          <Text
            style={[styles.paragraph, { color: isDark ? "#d1d5db" : "#333" }]}
          >
            Développement  : Josselin ROBERT, Jacques ANGLEYS,
            Othmane QAIBES, Lina ZAROUAL,
            Télécom SudParis dans le cadre du programme Cassiopée.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0A3D62",
    textAlign: "center",
    marginBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  version: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F3A93",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 10,
    textAlign: "justify",
  },
  button: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
