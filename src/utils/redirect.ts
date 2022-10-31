// Redirect Function
export default function redirect(url: string) {
    return {
      redirect: {
          destination: url,
          permenant: false
      }
    }
  }