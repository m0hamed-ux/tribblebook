import { StyleSheet } from "react-native";
export const theme = {
    colors: {
        primary: "#1D9BF0",
        primaryDark: "#1778C0",
        secondary: "#FFB400",
        background: "#FFFFFF",
        surface: "#F5F8FA",
        text: {
            primary: "#000000ff",
            secondary: "#3a3a3aff",
            muted: "#A0A0A0",
        },
        success: "#27AE60",
        error: "#E74C3C",
        buttonPrimary: {
            background: "#1D9BF0",
            text: "#FFFFFF",
        },
        buttonSecondary: {
            background: "#eaeaea",
            text: "#000000",
        },
    }
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignContent: 'center',
    padding: 16,
    writingDirection: "rtl"
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    textAlign: 'center',
    fontWeight: "600",
    marginVertical: 5,
    color: "#fff",
    fontFamily: 'bold',
  },
  buttonSecondary: {
    backgroundColor: theme.colors.buttonSecondary.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    textAlign: 'center',
    fontWeight: "600",
    marginVertical: 5,
    color: theme.colors.buttonSecondary.text,
    fontFamily: 'bold',
  },
  link: {
    color: theme.colors.primary,
    fontFamily: 'regular',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
    color: theme.colors.primary,
    fontFamily: 'bold',
  },
  input:{
    flex: 1,
    borderWidth: 1,
    borderColor: "#eaeaea",
    writingDirection: "rtl",
    padding: 16,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    textAlign: 'right',
    color: theme.colors.text.primary,
    fontFamily: 'regular',
  },
  icon: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#eaeaea",
    width: 44,
    height: "100%", 
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    fontFamily: 'light',
  }
})

export default theme